import {
    setupWallet,
    zkEVM_provider,
    ownerSigner,
    adminSigner,
    userSigner,
    aliceSigner,
    bobSigner,
} from "./utils/setupWallet";
import { expect } from "chai";
import dotenv from "dotenv";
dotenv.config();
import { ethers, Contract } from "ethers";
import { checkBalances } from "./utils/checkBalances";
import ERC20Token_artifacts from "../artifacts/src/marketplace_contracts/tokens/ERC20Token.sol/ERC20Token.json";
import ERC721Token_artifacts from "../artifacts/src/marketplace_contracts/tokens/ERC721Token.sol/ERC721Token.json";
import ERC721TokenLender_artifacts from "../artifacts/src/marketplace_contracts/tokens/ERC721Token_lender.sol/ERC721Token.json";
import NFTLend_artifacts from "../artifacts/src/marketplace_contracts/NFTLend.sol/Lend.json";

describe("NFTLend contract deployment & tests on zkEVM", async () => {
    // declare an instance of the contract to be deployed
    let nftContract: any;
    let nftLendContract: any;
    let lendContract: any;
    let tokenContract: any;

    // setup atleast 5 wallet addresses for testing
    const derivedNode = await setupWallet();

    before(async () => {
        console.log("\nAUTOMATE UNIT TEST CASES FOR NFT LENDING CONTRACT\n");

        /* 
            GET THE CONTRACT FACTORY
        */
        const token_Factory = new ethers.ContractFactory(
            ERC20Token_artifacts.abi,
            ERC20Token_artifacts.bytecode,
            ownerSigner
        );

        const nft_Factory = new ethers.ContractFactory(
            ERC721Token_artifacts.abi,
            ERC721Token_artifacts.bytecode,
            ownerSigner
        );

        const nftLend_Factory = new ethers.ContractFactory(
            ERC721TokenLender_artifacts.abi,
            ERC721TokenLender_artifacts.bytecode,
            ownerSigner
        );

        const lend_Factory = new ethers.ContractFactory(
            NFTLend_artifacts.abi,
            NFTLend_artifacts.bytecode,
            ownerSigner
        );

        console.log("Checking if wallet addresses have any balance....");
        await checkBalances(derivedNode);

        console.log("\nDeploying staking contract on zkEVM chain....");

        /* 
            DEPLOY THE CONTRACTS 
        */
        const token_contract = await token_Factory.deploy();
        await token_contract.deployed();

        const nft_contract = await nft_Factory.deploy();
        await nft_contract.deployed();

        const nftLend_contract = await nftLend_Factory.deploy();
        await nftLend_contract.deployed();

        const lend_contract = await lend_Factory.deploy(
            token_contract.address,
            nft_contract.address,
            await adminSigner.getAddress(),
            nftLend_contract.address
        );
        await lend_contract.deployed();

        /* 
            GET THE INSTANCE OF THE DEPLOYED CONTRACT 
        */
        tokenContract = new Contract(token_contract.address, ERC20Token_artifacts.abi, zkEVM_provider);
        nftContract = new Contract(nft_contract.address, ERC721Token_artifacts.abi, zkEVM_provider);
        nftLendContract = new Contract(
            nftLend_contract.address,
            ERC721TokenLender_artifacts.abi,
            zkEVM_provider
        );
        lendContract = new Contract(lend_contract.address, NFTLend_artifacts.abi, zkEVM_provider);

        console.log("\nERC20 token contract deployed at: ", tokenContract.address);
        console.log("ERC721 token contract deployed at: ", nftContract.address);
        console.log("ERC721 token 2 contract deployed at: ", nftLendContract.address);
        console.log("NFTLend contract deployed at: ", lendContract.address);
        console.log("\nSetting up the ideal scenario for NFTLend....\n");

        /* 
            TRANSFER ERC20 TOKEN TO THE USERS
        */
        console.log("TRANSFERRING ERC20 TOKENS TO THE TEST USERS");
        const transferToken_alice = await tokenContract
            .connect(ownerSigner)
            .transfer(aliceSigner.getAddress(), "10000");
        await transferToken_alice.wait();
        expect(await tokenContract.balanceOf(await aliceSigner.getAddress())).eq("10000");

        const transferToken_bob = await tokenContract
            .connect(ownerSigner)
            .transfer(bobSigner.getAddress(), "10000");
        await transferToken_bob.wait();
        expect(await tokenContract.balanceOf(await bobSigner.getAddress())).eq("10000");

        const transferToken_lendContract = await tokenContract
            .connect(ownerSigner)
            .transfer(lendContract.address, "10000");
        await transferToken_lendContract.wait();
        expect(await tokenContract.balanceOf(lendContract.address)).eq("10000");

        /* 
            WHITELIST ADDRESSES FOR ERC721 TOKEN
        */
        console.log("WHITE LISTING ADDRESSES ON NFT_1");
        const whitelist_owner = await nftContract
            .connect(ownerSigner)
            .addToWhitelist(ownerSigner.getAddress());
        await whitelist_owner.wait();
        expect(await nftContract.checkWhitelist(await ownerSigner.getAddress())).eq(true);

        const whitelist_alice = await nftContract
            .connect(ownerSigner)
            .addToWhitelist(aliceSigner.getAddress());
        await whitelist_alice.wait();
        expect(await nftContract.checkWhitelist(await aliceSigner.getAddress())).eq(true);

        const whitelist_bob = await nftContract.connect(ownerSigner).addToWhitelist(bobSigner.getAddress());
        await whitelist_bob.wait();
        expect(await nftContract.checkWhitelist(await bobSigner.getAddress())).eq(true);

        const whitelist_lendContract = await nftContract
            .connect(ownerSigner)
            .addToWhitelist(lendContract.address);
        await whitelist_lendContract.wait();
        expect(await nftContract.checkWhitelist(lendContract.address)).eq(true);

        /* 
            WHITELIST ADDRESSES FOR ERC721 TOKEN
        */
        console.log("WHITE LISTING ADDRESSES ON NFT_2");
        const whitelist2_owner = await nftLendContract
            .connect(ownerSigner)
            .addToWhitelist(ownerSigner.getAddress());
        await whitelist2_owner.wait();
        expect(await nftLendContract.checkWhitelist(await ownerSigner.getAddress())).eq(true);

        const whitelist2_alice = await nftLendContract
            .connect(ownerSigner)
            .addToWhitelist(aliceSigner.getAddress());
        await whitelist2_alice.wait();
        expect(await nftLendContract.checkWhitelist(await aliceSigner.getAddress())).eq(true);

        const whitelist2_bob = await nftLendContract
            .connect(ownerSigner)
            .addToWhitelist(bobSigner.getAddress());
        await whitelist2_bob.wait();
        expect(await nftLendContract.checkWhitelist(await bobSigner.getAddress())).eq(true);

        const whitelist2_lendContract = await nftLendContract
            .connect(ownerSigner)
            .addToWhitelist(lendContract.address);
        await whitelist2_lendContract.wait();
        expect(await nftContract.checkWhitelist(lendContract.address)).eq(true);

        /* 
            MINT ERC721 TOKEN TO RESPECTIVE USERS 
        */
        console.log("MINTING 3 NFT_1 TO ALICE TEST USER");
        const issueToken_1 = await nftContract
            .connect(ownerSigner)
            .issueToken(aliceSigner.getAddress(), 1, `hash-01`);
        await issueToken_1.wait();
        expect(await nftContract.ownerOf(1)).eq(await aliceSigner.getAddress());

        const issueToken_2 = await nftContract
            .connect(ownerSigner)
            .issueToken(aliceSigner.getAddress(), 2, `hash-02`);
        await issueToken_2.wait();
        expect(await nftContract.ownerOf(1)).eq(await aliceSigner.getAddress());
        const issueToken_3 = await nftContract
            .connect(ownerSigner)
            .issueToken(aliceSigner.getAddress(), 3, `hash-03`);
        await issueToken_3.wait();
        expect(await nftContract.ownerOf(1)).eq(await aliceSigner.getAddress());

        /*
            SET LENDER ADDRESS
        */
        console.log("SETTING THE LENDER ADDRESS\n");
        await nftLendContract.connect(ownerSigner).setLenderContractAddress(lendContract.address);
    });

    describe("NFTLend contract functionalities tests", async () => {
        it("...should have correct NFT address", async () => {
            expect(await lendContract.nftAddress()).to.eq(nftContract.address);
        });

        it("...should not allow lender to list NFT for Lending without granting approval", async () => {
            await expect(lendContract.connect(aliceSigner).lendNft([1], 1000, 1000, 100)).to.revertedWith(
                "ERC721: caller is not token owner nor approved"
            );
        });

        it("...should allow lender to list NFT for lending", async () => {
            const approveResult = await nftContract.connect(aliceSigner).approve(lendContract.address, 1);
            await approveResult.wait();

            const saleResult = await lendContract.connect(aliceSigner).lendNft([1], 1000, 25, 100);
            await saleResult.wait();
            expect(await nftContract.ownerOf(1)).eq(lendContract.address);
        });

        it("...should allow renter to Rent NFT", async () => {
            let approveResult2 = await tokenContract.connect(bobSigner).approve(lendContract.address, 1000);
            await approveResult2.wait();

            let purchaseResult = await lendContract.connect(bobSigner).rentNft(1);
            await purchaseResult.wait();
            expect(await nftLendContract.ownerOf(1)).to.eq(await bobSigner.getAddress());
        });

        it("...should not allow lender to cancel sale if the NFT is lended", async () => {
            await expect(lendContract.connect(aliceSigner).cancelLendNft(1)).to.revertedWith(
                "NFT is already Lended"
            );
        });

        it("...should not allow renter to transfer the nftLend", async () => {
            await expect(
                nftLendContract
                    .connect(bobSigner)
                    .transferFrom(await bobSigner.getAddress(), await userSigner.getAddress(), 1)
            ).to.revertedWith("NFT transfer isn't allowed");
        });

        it("...should not allow renter to burn the Game nftLend", async () => {
            await expect(nftLendContract.connect(bobSigner).burn(1)).to.revertedWith(
                "You cannot burn your own token"
            );
        });

        /*
            AWAITING INTERNAL TRANSACTION EROR
        */

        it("...should allow lender to cancel Lend", async () => {
            const approveResult = await nftContract.connect(aliceSigner).approve(lendContract.address, 2);
            await approveResult.wait();

            const saleResult = await lendContract.connect(aliceSigner).lendNft([2], 1000, 1000, 100);
            await saleResult.wait();
            expect(await nftContract.ownerOf(2)).to.eq(lendContract.address);

            const cancelledResult = await lendContract.connect(aliceSigner).cancelLendNft(2);
            await cancelledResult.wait();
            expect(await nftContract.ownerOf(2)).to.eq(await aliceSigner.getAddress());
        });

        it("...should not allow lender to claim NFT before its duration (1000000) is over", async () => {
            const approveResult = await nftContract.connect(aliceSigner).approve(lendContract.address, 3);
            await approveResult.wait();

            const saleResult = await lendContract.connect(aliceSigner).lendNft([3], 1000, 1000000, 100);
            await saleResult.wait();
            expect(await nftContract.ownerOf(3)).to.eq(lendContract.address);

            const approveResult2 = await tokenContract
                .connect(aliceSigner)
                .approve(lendContract.address, 1000);
            await approveResult2.wait();

            const purchaseResult = await lendContract.connect(aliceSigner).rentNft(3);
            await purchaseResult.wait();
            expect(await nftLendContract.ownerOf(3)).to.eq(await aliceSigner.getAddress());

            await expect(lendContract.connect(aliceSigner).claimNft(3)).to.be.revertedWith(
                "Lending time isn't over yet"
            );
        });
    });
});