const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const net = require('node:net');
const assert = require('node:assert/strict');
const solc = require('solc');
const { JsonRpcProvider, Wallet, ContractFactory, keccak256 } = require('ethers');

async function main() {
  const port = await new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => {
    const address = server.address(); server.close(() => resolve(address.port));
  }); });
  const process = spawn('anvil', ['--host', '127.0.0.1', '--port', String(port), '--chain-id', '1', '--silent'], { stdio: 'pipe' });
  const provider = new JsonRpcProvider(`http://127.0.0.1:${port}`, 1, { cacheTimeout: -1 });
  const directory = await mkdtemp(join(tmpdir(), 'world4-owner-driver-'));
  try {
    await new Promise((resolve, reject) => {
      const deadline = Date.now() + 10000;
      const check = async () => { try { await provider.getBlockNumber(); resolve(); }
        catch (error) { if (Date.now() > deadline) reject(error); else setTimeout(check, 100); } }; void check();
      process.once('error', reject);
    });
    const wallet = Wallet.createRandom().connect(provider);
    await provider.send('anvil_setBalance', [wallet.address, '0x56bc75e2d63100000']);
    const source = `pragma solidity ^0.8.30;
contract Token { mapping(address=>uint) public balanceOf; mapping(address=>mapping(address=>uint)) public allowance;
function mint(address a,uint n) external {balanceOf[a]+=n;} function approve(address a,uint n) external returns(bool){allowance[msg.sender][a]=n;return true;}
function transferFrom(address a,address b,uint n) external returns(bool){require(balanceOf[a]>=n&&allowance[a][msg.sender]>=n); balanceOf[a]-=n;balanceOf[b]+=n;allowance[a][msg.sender]-=n;return true;}}
contract Router { struct Desc {address srcToken;address dstToken;address[] srcReceivers;uint[] srcAmounts;address[] feeReceivers;uint[] feeAmounts;address dstReceiver;uint amount;uint minReturnAmount;uint flags;bytes permit;}
struct Execution {address callTarget;address approveTarget;bytes targetData;Desc desc;bytes clientData;}
function swap(Execution calldata e) external payable returns(uint,uint){Token(e.desc.srcToken).transferFrom(msg.sender,address(this),e.desc.amount);Token(e.desc.dstToken).mint(e.desc.dstReceiver,e.desc.minReturnAmount);return(e.desc.minReturnAmount,0);}}`;
    const output = JSON.parse(solc.compile(JSON.stringify({ language: 'Solidity', sources: { 'Fixture.sol': { content: source } },
      settings: { outputSelection: { '*': { '*': ['abi', 'evm.bytecode.object'] } } } })));
    const contracts = output.contracts['Fixture.sol'];
    async function deploy(name) { const artifact = contracts[name]; const contract = await new ContractFactory(artifact.abi, artifact.evm.bytecode.object, wallet).deploy(); await contract.waitForDeployment(); return contract; }
    const tokenIn = await deploy('Token'); const tokenOut = await deploy('Token'); const router = await deploy('Router');
    await (await tokenIn.mint(wallet.address, 1000)).wait(); await (await tokenIn.approve(await router.getAddress(), 100)).wait();
    const { OwnerSwapAdapter, KyberRouterInterface } = await import('../dist/owner-swap.js').then(async module => ({ ...module, ...(await import('../dist/swap-policy.js')) }));
    const policy = { chainId: 1, wallet: wallet.address, router: await router.getAddress(), routerCodeHash: keccak256(await provider.getCode(await router.getAddress())),
      executors: [await router.getAddress()], assets: [await tokenIn.getAddress(), await tokenOut.getAddress()], inputAsset: await tokenIn.getAddress(),
      maxInputRaw: '100', dailyInputRaw: '100', maxGasWei: '100000000000000000', minGasReserveWei: '1000000000000000000', enabled: true, version: 1,
      expiresAt: new Date(Date.now() + 60000).toISOString() };
    const request = { idempotencyKey: 'local-chain-swap', tokenIn: policy.inputAsset, tokenOut: await tokenOut.getAddress(), amountIn: '100', minAmountOut: '90', expiresAt: policy.expiresAt };
    const data = KyberRouterInterface.encodeFunctionData('swap', [[policy.router, policy.router, '0x', [request.tokenIn, request.tokenOut, [policy.router], [100], [], [], wallet.address, 100, 90, 0, '0x'], '0x']]);
    const adapter = new OwnerSwapAdapter({ wallet, provider, journalPath: join(directory, 'execution.json'), loadPolicy: async () => policy });
    const execution = await adapter.execute(request, data);
    assert.equal((await adapter.execute(request, data)).hash, execution.hash);
    await provider.send('anvil_mine', ['0xc']);
    assert.equal((await adapter.reconcile(request.idempotencyKey)).status, 'confirmed');
    assert.equal(await tokenOut.balanceOf(wallet.address), 90n);
    assert.equal(await tokenIn.balanceOf(wallet.address), 900n);
    await assert.rejects(adapter.execute({ ...request, idempotencyKey: 'second-local-swap' }, data), /budget/);
    console.log('Local chain-1 fixture: signed swap confirmed, real token balances changed, idempotent replay and budget rejection verified. No mainnet transaction.');
  } finally { provider.destroy(); process.kill(); await rm(directory, { recursive: true, force: true }); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
