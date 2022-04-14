const yargs = require('yargs');
const Web3 = require('web3');
const web3 = new Web3("https://data-seed-prebsc-1-s1.binance.org:8545");

const { Proxies } = require('../testnet/.deployment_data_test.json');
// const proxies = Proxies.Dev2;
const collectionAddress = "0x7b2df7e30ec900e40fbef2414848390319890d25";

var CollectionContract = require('../../artifacts/contracts/dfy-nft/DefiForYouNFT.sol/DefiForYouNFT.json');
var collection = new web3.eth.Contract(CollectionContract.abi, collectionAddress);


// Process input parameters
const argv = yargs
    .command('block', 'Block to scan', {
        fromBlock: {
            description: 'The block to scan for events',
            alias: 'f',
            type: 'number',
        }
    })
    .option('toBlock', {
        alias: 't',
        description: 'The last block to scan',
        type: 'number'
    })
    .option('allEvents', {
        alias: 'a',
        description: 'Show all events',
        type: 'boolean'
    })
    .option('eventDetails', {
        alias: 'd',
        description: 'Show event details',
        type: 'boolean'
    })
    .help()
    .alias('help', 'h')
    .argv;


if(argv._.includes('block')) {
    let startBlock = argv.fromBlock;
    let endBlock = (argv.toBlock > argv.fromBlock) ? argv.toBlock : argv.fromBlock;
    let eventFilter = argv.allEvents ? "allEvents" : "NFTCreated";
    console.log(`From block: ${startBlock} - to block: ${endBlock}`);

    // Get past events from contract
    collection.getPastEvents(eventFilter, {
        fromBlock: startBlock,
        toBlock: endBlock, 
        function(error, events) {
            showOutput(events, argv.allEvents, argv.eventDetails);
        }
    }).then(function(events) {
        showOutput(events, argv.allEvents, argv.eventDetails);
    });
}
else {
    console.log("Block parameter is required. Type --help for usages.");
}

const showOutput = (events, allEvents, showDetails) => {
    if(!allEvents) {
        if(showDetails) {
            for(var i = 0; i < events.length; i++) {
                console.log(`Block number: ${events[i].blockNumber}`);
                console.log(`Event: ${events[i].event}`);
                console.log(events[i].returnValues);
            }
        }
        else {
            for(var i = 0; i < events.length; i++) {
                if(events[i].returnValues.exchangeRate !== undefined) {
                    console.log(`Block number: ${events[i].blockNumber}`);
                    console.log(`Exchange Rate: ${events[i].returnValues.exchangeRate}`);
                }
            }
        }
    }
    else {
        if(showDetails) {
            for(var i = 0; i < events.length; i++) {
                console.log(`Block number: ${events[i].blockNumber}`);
                console.log(`Event: ${events[i].event}`);
                console.log(events[i].returnValues);
            }
        }
        else {
            console.log(events);
        }
    }
}

console.log(argv);