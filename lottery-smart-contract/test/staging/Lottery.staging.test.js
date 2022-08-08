const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Staging Tests", function () {
      let lottery, entranceFee, deployer;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        lottery = await ethers.getContract("Lottery", deployer);
        entranceFee = await lottery.getEntranceFee();
      });

      describe("fullfilRandomWords", () => {
        it("works with live Chainlink keepers and Chainlink VRF,we get a random winner", async (done) => {
          console.log("Setting up test...");
          const startingTimestamp = await lottery.getLatestTimestamp();
          const accounts = await ethers.getSigners();
          console.log("Setting up Listener...");
          await new Promise(async (resolve, reject) => {
            //setup listener before we enter lottery
            lottery.once("WinnerPicked", async () => {
              console.log("Winner picked event fired..");

              try {
                const recentWinner = await lottery.getRecentWinner();
                const lotteryState = await lottery.getLotteryState();
                const winnerEndingBalance = await accounts[0].getBalance();
                const endingTimstamp = await lottery.getLatestTimestamp();
                const numPlayers = await lottery.getNumberOfPlayers();
                assert.equal(numPlayers.toString(), "0");
                assert.equal(lotteryState.toString(), "0");
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(entranceFee).toString()
                );
                assert(endingTimstamp > startingTimestamp);
                resolve();
              } catch (error) {
                reject(error);
              }
            });
            //enter lottery
            const tx = await lottery.enterLottery({ value: entranceFee });
            await tx.wait(1);
            console.log("Ok, time to wait...");
            const winnerStartingBalance = await accounts[0].getBalance();
          });
          done();
        });
      });
    });
