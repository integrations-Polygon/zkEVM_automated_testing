import { expect } from "chai";
import dotenv from "dotenv";
dotenv.config();
import {
    setupWallet,
    zkEVM_provider,
    ownerSigner,
    adminSigner,
    userSigner,
    bobSigner,
} from "./utils/setupWallet";
import { ethers, Contract } from "ethers";
import { checkBalances } from "./utils/checkBalances";
import timelock_artifacts from "../artifacts/src/Timelock.sol/Timelock.json";
import testTimelock_artifacts from "../artifacts/src/TestTimelock.sol/TestTimelock.json";

const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

describe("Timelock smart contract deployment & tests on zkEVM", async () => {
    // declare an instance of the contracts to be deployed
    let timelockContract: any, testTimelockContract: any;
    let timestamp;

    // setup atleast 5 wallet addresses for testing
    const derivedNode = await setupWallet();

    before(async () => {
        console.log("\nAUTOMATE UNIT TEST CASES FOR TIMELOCK CONTRACT\n");

        // get the contract factory
        const timelockContractFactory = new ethers.ContractFactory(
            timelock_artifacts.abi,
            timelock_artifacts.bytecode,
            ownerSigner
        );
        const testTimelockContractFactory = new ethers.ContractFactory(
            testTimelock_artifacts.abi,
            testTimelock_artifacts.bytecode,
            ownerSigner
        );

        console.log("Checking if wallet addresses have any balance....");
        await checkBalances(derivedNode);

        console.log("\nDeploying Timelock contract and testTimelock contract on zkEVM chain....");

        // deploy the Timelock contract
        const timelock = await timelockContractFactory.deploy();

        // wait for the Timelock contract to get deployed
        await timelock.deployed();

        // deploy the TestTimelock token contract
        const testTimelock = await testTimelockContractFactory.deploy(timelock.address);

        // wait for the TestTimelock contract to get deployed
        await testTimelock.deployed();

        // get the instance of the deployed Timelock contract
        timelockContract = new Contract(timelock.address, timelock_artifacts.abi, zkEVM_provider);

        // get the instance of the deployed TestTimelock contract
        testTimelockContract = new Contract(testTimelock.address, testTimelock_artifacts.abi, zkEVM_provider);

        console.log("\nTimelock contract deployed at: ", timelockContract.address);
        console.log(
            `Contract Details: https://explorer.public.zkevm-test.net/address/${timelockContract.address}`
        );
        console.log("\nTestTimelock contract deployed at: ", testTimelockContract.address);
        console.log(
            `Contract Details: https://explorer.public.zkevm-test.net/address/${testTimelockContract.address}`
        );
        console.log("\n");

        // get block.timestamp + 50
        timestamp = await testTimelockContract.getTimestamp();
    });

    describe("TestTimelock smart contract functionality tests", async () => {
        it("...should have correct Timelock contract address", async () => {
            expect(await testTimelockContract.timelock()).eq(timelockContract.address);
        });

        it("...should revert when called by an address that is not Timelock contract address", async () => {
            await expect(testTimelockContract.connect(ownerSigner).test()).to.revertedWith(
                "caller is not the timelock smart contract"
            );
        });
    });

    describe("Timelock smart contract functionality tests", async () => {
        it("...should have correct owner", async () => {
            expect(await timelockContract.owner()).eq(derivedNode[0].address);
        });

        it("...should be able to queue a transaction under timelock", async () => {
            // queue a tx
            const queueTx = await timelockContract
                .connect(ownerSigner)
                .queue(testTimelockContract.address, 0, "test()", 0x00, timestamp);
            await queueTx.wait(1);

            // get txId
            const txId = await timelockContract.getTxId(
                testTimelockContract.address,
                0,
                "test()",
                0x00,
                timestamp
            );

            // check if a queue for this txId exist in the mapping
            expect(await timelockContract.queued(txId)).to.be.true;
        });

        it("...should not be able to execute a queued transaction before its due time", async () => {
            await expect(
                timelockContract
                    .connect(ownerSigner)
                    .execute(testTimelockContract.address, 0, "test()", 0x00, timestamp)
            ).to.be.reverted;
        });

        /*  
            Error: (Awaiting internal transactions for reason)
            when trying to revoke confirmation from 1 to 0
        */

        it("...should be able to execute a queued transaction after its due time(approx 1min)", async () => {
            // wait at least 1 min for timelock period to expire
            await sleep(60000);

            const executeTx = await timelockContract
                .connect(ownerSigner)
                .execute(testTimelockContract.address, 0, "test()", 0x00, timestamp);
            await executeTx.wait(1);

            // get txId
            const txId = await timelockContract.getTxId(
                testTimelockContract.address,
                0,
                "test()",
                0x00,
                timestamp
            );

            // queue for this txId should not exist in the mapping after execution
            expect(await timelockContract.queued(txId)).to.be.false;
        });
    });
});
