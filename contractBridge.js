const fs = require("fs");
const Web3 = require('web3');
const solc = require('solc');

const CryptoJS = require("crypto-js");

const Tx = require('ethereumjs-tx').Transaction;
const Common = require('@ethereumjs/common').default;

const { ethers } = require("ethers");


function showJson(value){
    console.log( JSON.stringify(value) );
}

let para = {
    chainName : process.argv[2],
    pw : process.argv[3],
    option : process.argv[4],
    datas : [],
}

for(var i=0;i<process.argv.length;i++){
    if(i > 4){
        para.datas.push(process.argv[i]);
    }
}

const chainServers = {
    eth_main : { url : 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', num : 1 },
    eth_test : { url : 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', num : 5 },
    bsc_main : { url : 'https://bsc-dataseed.binance.org', num : 56 },
    bsc_test : { url : 'https://data-seed-prebsc-1-s1.binance.org:8545', num : 97 },
}

if(chainServers[para['chainName']] == undefined){
    console.log('node contractBridge.js {SERVER} {PW} {OPTION} {DATAS} ...');
    console.log('node contractBridge.js eth_test 1 sendToken send_wallet send_wallet_pk r_wallet value');
    
    //node create.js bsc_main e721.sol ARTiNFT  node create.js bsc_test e721.sol ARTiNFT 
    return;
}

const sel_wallet_num = 0;

const wallets = [
    [
        "WALLET", 
        "AES256_PK",
    ],
];

const _from = wallets[sel_wallet_num][0];
let _from2 = wallets[sel_wallet_num][1];
_from2 = dec(_from2, para['pw']);


const serverUrl = chainServers[para['chainName']]['url'];
const chainNumber = chainServers[para['chainName']]['num'];

const common = Common.custom({ chainId: chainNumber });
const web3 = new Web3(serverUrl);

//console.log(para.datas);

start(para['option'], para['datas']);
async function start(option, datas){
    if(option == "check"){
        showJson({code : 0, msg : "SUCCESS", result : para });
        return;
    }
    else if(option == "create"){
        // create FILE_NAME CONTRACT_NAME
        await contractCreate(datas[0], datas[1]);
        return;
    }
    else if(option == "pw_enc"){
        // pw_enc VALUE PW
        var r = enc(datas[0], datas[1]);
        showJson({code : 0, msg : "SUCCESS", result : r });
        return;
    }
    else if(option == "pw_dec"){
        // pw_dec VALUE PW
        var r = dec(datas[0], datas[1]);
        showJson({code : 0, msg : "SUCCESS", result : r });
        return;
    }
    else if(option == "creWallet"){
        // creWallet PW
		var r = await creWallet();
        var addr = r.address;
        var pk = r.privateKey;

        if(datas[0] != undefined){
            pk = enc(r.privateKey, CryptoJS.SHA256(datas[0]).toString());
        }

		showJson({code : 0, msg : "SUCCESS", result : [addr, pk ] });
        return;
	}
    else if(option == "get_balance"){
        // creWallet WALLET
        if(!web3.utils.isAddress(datas[0])){
            showJson({code : 100, msg : "The address format is incorrect.", result : []});
            return;
        }

        var r = await get_balance(datas[0]);
        showJson({code : 0, msg : "SUCCESS", result : r});
        return;
    }
    else if(option == "sendToken"){
        let check = [datas[0], datas[2]];
        for(var i=0;i<check.length;i++){
            if(!web3.utils.isAddress(check[i])){
                showJson({code : 100, msg : "The address format is incorrect."});
                return;
            }
        }

        var r = await sendToken(datas[0], datas[1], datas[2], datas[3]);

        showJson({code : r[0], msg : "SUCCESS", result : r[1] });
        return;
    }
    else if(option == "pkToAccount"){
		try{
			var r = await web3.eth.accounts.privateKeyToAccount(datas[0]);
            var addr = r.address;
            var pk = r.privateKey;

            if(datas[1] != undefined){
                pk = enc(r.privateKey, CryptoJS.SHA256(datas[1]).toString());
            }
		}
		catch(e){
			showJson({code : 100, msg : "Fail", result : e });
            return;
		}

		showJson({code : 0, msg : "SUCCESS", result : [addr, pk] });
        return;
	}
    else if(option == "get_erc20_balance"){
        var r = await get_erc20Balance(datas[0], datas[1]);
		showJson({code : 0, msg : "SUCCESS", result : r });
        return;
	}
    else if(option == "getErc20Info"){
		var r = await getErc20Info(datas[0]);

        showJson({code : r[0], msg : "SUCCESS", result : r[1] });
        return;
	}
    else if(option == "sendERC20"){
        // from, from2, to, value, dec, contractAddress	
        var r = await sendERC20( datas[0], datas[1], datas[2], datas[3], datas[4], datas[5] );

        showJson({code : r[0], msg : "SUCCESS", result : r[1] });
        return;
	}


    showJson({code : 100, msg : "Fail", result : [] });
    return;
}

function enc(value, key){
    return CryptoJS.AES.encrypt(value, key).toString();
}

function dec(value, key){
    var bytes = CryptoJS.AES.decrypt(value, key);
    return bytes.toString(CryptoJS.enc.Utf8);
}

async function creWallet(){
	return web3.eth.accounts.create();
}

async function get_balance(address){
    var v = await web3.eth.getBalance(address);
    return web3.utils.fromWei(v, "ether");
}

function get_abi(file_name, contract_name){
    const source = fs.readFileSync(file_name, 'UTF-8');
    let c_name = contract_name;

    var input = {
        language: 'Solidity',
        sources: {
            'file.sol' : {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': [ '*' ]
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };

    let compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

    // error check
    // console.log(compiledContract);
    // return;

    let abi = compiledContract.contracts['file.sol'][c_name].abi;
    return abi;
}

async function contractCreate(file_name, contract_name){
    const source = fs.readFileSync(file_name, 'UTF-8');
    let c_name = contract_name;

    var input = {
        language: 'Solidity',
        sources: {
            'file.sol' : {
                content: source
            }
        },
        settings: {
            outputSelection: {
                '*': {
                    '*': [ '*' ]
                }
            },
            optimizer: {
                enabled: true,
                runs: 200
            }
        }
    };

    let compiledContract = JSON.parse(solc.compile(JSON.stringify(input)));

    // error check
    // console.log(compiledContract);
    // return;

    let abi = compiledContract.contracts['file.sol'][c_name].abi;
    let bytecode = compiledContract.contracts['file.sol'][c_name].evm.bytecode.object;

    // console.log(JSON.stringify(abi));
    // return;

    let gasEstimate = await web3.eth.estimateGas({data: bytecode});
    let contract = new web3.eth.Contract(abi);

    await web3.eth.accounts.wallet.add('0x' + _from2);

    contract
    .deploy({ data: bytecode })
    .send({ 
        from: _from, 
        gas : gasEstimate+1000000,
    })
    .on("receipt", (receipt) => {
        // console.log(receipt);
        //console.log("Transaction Hash:", receipt.transactionHash);
        //console.log("Contract Address:", receipt.contractAddress);
        showJson({code : 0, msg : "SUCCESS", result : [receipt.contractAddress, receipt.transactionHash] });
    })
    .then((initialContract) => {
        // console.log(initialContract);
        // initialContract.methods.message().call((err, data) => {
        //     console.log("Initial Data:", data);
        // });
    });
}

async function sendToken(from, from2, to, value, sym = 'ether'){
    var gasp = await web3.eth.getGasPrice();
    gasp = parseInt(web3.utils.fromWei(gasp, 'gwei'))+3;
    gasp = web3.utils.toWei(gasp.toString(), 'gwei');

    from2 = Buffer.from(from2, 'hex');

    return new Promise( (resolve, reject) => {
        web3.eth.getTransactionCount(from, (err, txCount) => {
			if (err) {
				resolve([101,err]);
				return;
			}
            // Build a transaction
            const txObject2 = {
                 nonce: web3.utils.toHex(txCount),
                 to: to,
                 value: web3.utils.toHex(web3.utils.toWei(value, sym)),
                 gasLimit: web3.utils.toHex(21000),
                 gasPrice : web3.utils.toHex(gasp),
				 //gas: web3.utils.toHex(21000),
            }
        
            // Sign the transaction
            const tx = new Tx(txObject2, { common });
            tx.sign(from2);
            const serializedTransaction = tx.serialize();
            const raw = '0x' + serializedTransaction.toString('hex');
        
            // Broadcast the transaction
            web3.eth.sendSignedTransaction(raw, (err, txHash) => {
				if (err) {
					resolve([102,err]);
					return;
				}
                resolve([0,txHash]);
            });
        });
    });
}

async function get_erc20Balance(wallet, c_address, ){
    let abi = get_abi('./solidity/e20.sol', 'MyToken1');

	var contract = new web3.eth.Contract(abi, c_address);
	var r = await contract.methods.balanceOf(wallet).call();
	var dec = await contract.methods.decimals().call();

	r = ethers.utils.formatUnits(r, dec);
	return r;
}

function getErc20Info(contractAddress){
    let abi = get_abi('./solidity/e20.sol', 'MyToken1');

	var contract = new web3.eth.Contract(abi, contractAddress);

	return new Promise( async (resolve, reject) => {
		try{
			var dec = await contract.methods.decimals().call();
			var symbol = await contract.methods.symbol().call();
			resolve([ 0,[symbol, dec] ]);
			return;
		}
		catch(e){
			resolve([100,[e] ]);
			return;
		}
	});
}

async function sendERC20(from, from2, to, value, dec, contractAddress){
    var get_gas = await web3.eth.getGasPrice();
    var gasP = 0;
    get_gas = parseInt(web3.utils.fromWei(get_gas, 'gwei'))+1;
    gasP = web3.utils.toWei(get_gas.toString(), 'gwei');

    let setGAS = web3.utils.toHex(300000);

    let txObject = {
        nonce: web3.utils.toHex(1),
        from: _from,
        to: "contractAddress",
        gasLimit: web3.utils.toHex(100000),
        gasPrice : web3.utils.toHex(100000),
        value: '0x0',
        data: [],
    }

    txObject['gasLimit'] = setGAS;

    let abi = get_abi('./solidity/e20.sol', 'MyToken1');

    var contract = new web3.eth.Contract(abi, contractAddress, {from: from})
    //value = value*decToWei(dec);
	value = ethers.utils.parseUnits(value.toString(), dec);
	value = value.toString();

	from2 = Buffer.from(from2, 'hex');

    return new Promise( (resolve, reject) => {
        web3.eth.getTransactionCount(from, (err, txCount) => {
			if (err) {
				resolve([100,err]);
				return;
			}
            // Build a transaction
            txObject['nonce'] = web3.utils.toHex(txCount);
            txObject['gasPrice'] = web3.utils.toHex(gasP);
            txObject['data'] = contract.methods.transfer(to, value).encodeABI();
    
            txObject['to'] = contractAddress;

            // Sign the transaction
            const tx = new Tx(txObject, {common});
            tx.sign(from2);
            const serializedTransaction = tx.serialize();
            const raw = '0x' + serializedTransaction.toString('hex');
        
            // Broadcast the transaction
            web3.eth.sendSignedTransaction(raw.toString('hex'), (err, txHash) => {
				if (err) {
					resolve([100,err]);
					return;
				}
				resolve([0,txHash]);
            });
			
        });
    });
}