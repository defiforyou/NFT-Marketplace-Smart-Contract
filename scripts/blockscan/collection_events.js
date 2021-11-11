const yargs = require('yargs');
const Web3 = require('web3');
const web3 = new Web3("https://data-seed-prebsc-1-s1.binance.org:8545");

const { Proxies } = require('../.deployment_data_test.json');
const proxies = Proxies.Test2;

var FactoryContract = require('../../artifacts/contracts/DefiForYouNFTFactory.sol/DefiForYouNFTFactory.json');
var factory = new web3.eth.Contract(FactoryContract.abi, proxies.NFT_FACTORY_ADDRESS);


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
    let eventFilter = argv.allEvents ? "allEvents" : "CollectionCreated";
    console.log(`From block: ${startBlock} - to block: ${endBlock}`);

    // Get past events from contract
    factory.getPastEvents(eventFilter, {
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