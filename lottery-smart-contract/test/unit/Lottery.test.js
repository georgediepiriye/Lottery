const { assert, expect } = require("chai");
const { network, getNamedAccounts, deployments, ethers } = require("hardhat");
const {
  developmentChains,
  networkConfig,
} = require("../../helper-hardhat-config");

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Lottery Unit Tests", function () {
      let lottery, vrfCoordinatorV2Mock, entranceFee, deployer, interval;
      const chainId = network.config.chainId;

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        lottery = await ethers.getContract("Lottery", deployer);
        vrfCoordinatorV2Mock = await ethers.getContract(
          "VRFCoordinatorV2Mock",
          deployer
        );
        entranceFee = await lottery.getEntranceFee();
        interval = await lottery.getInterval();
      });

      //test for constructor
      describe("constructor", function () {
        it("initializes the lottery state correctly", async function () {
          const lotteryState = await lottery.getLotteryState();
          assert.equal(lotteryState.toString(), "0");
        });

        it("initializes the interval correctly", async function () {
          assert.equal(interval.toString(), networkConfig[chainId]["interval"]);
        });
      });

      //test for enter lottery
      describe("enter lottery", function () {
        it("reverts when you do not pay enough ether", async function () {
          await expect(lottery.enterLottery()).to.be.revertedWith(
            "Not enough ETH"
          );
        });

        it("records players when they enter lottery", async function () {
          await lottery.enterLottery({ value: entranceFee });
          const playerInContract = await lottery.getPlayer(0);
          assert.equal(playerInContract, deployer);
        });

        it("emits events on enter", async function () {
          await expect(lottery.enterLottery({ value: entranceFee })).to.emit(
            lottery,
            "LotteryEnter"
          );
        });

        it("doesnt allow entrance when lottery is calculating", async function () {
          /**to change the lottery state to calculating,we have to call performUpKeep.
           * but before performUpkeep can be called, upkeepNeeded has to be true
           */
          await lottery.enterLottery({ value: entranceFee });
          //increase the blockchain time,so timePassed in the checkUpkeep will be true
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);

          //we pretend to be chainlink keeper
          await lottery.performUpkeep([]);
          await expect(
            lottery.enterLottery({ value: entranceFee })
          ).to.be.revertedWith("Lottery not Open");
        });
      });

      describe("checkUpKeep", function () {
        it("returns false if people havent sent any ETH", async function () {
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          //use callStatic to simulate calling checkUpKeep to skip sending eth
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          assert(upkeepNeeded == false);
        });

        it("returns false if lottery isn't open", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          await lottery.performUpkeep([]);
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep([]);
          const lotteryState = await lottery.getLotteryState();
          assert.equal(lotteryState, "1");
          assert.equal(upkeepNeeded, false);
        });

        it("returns false if enough time hasn't passed", async function () {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() - 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert.equal(upkeepNeeded, false);
        });
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.request({ method: "evm_mine", params: [] });
          const { upkeepNeeded } = await lottery.callStatic.checkUpkeep("0x"); // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
          assert(upkeepNeeded);
        });
      });

      describe("performUpKeep", () => {
        it("only runs when checkUpKeep is true", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const tx = await lottery.performUpkeep([]);
          assert(tx);
        });
        it("reverts when checkupKeep is false", async () => {
          await expect(lottery.performUpkeep([])).to.be.revertedWith(
            "Upkeep not needed"
          );
        });
        it("updates the lottery state,emits an event and calls vrf coodinator", async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
          const txResponse = await lottery.performUpkeep([]);
          const txReceipt = await txResponse.wait(1);
          const requestId = await txReceipt.events[1].args.requestId;
          const lotteryState = await lottery.getLotteryState();
          assert(lotteryState.toString() == "1");
          assert(requestId.toNumber() > 0);
        });
      });

      describe("fullfilRandomWords", () => {
        beforeEach(async () => {
          await lottery.enterLottery({ value: entranceFee });
          await network.provider.send("evm_increaseTime", [
            interval.toNumber() + 1,
          ]);
          await network.provider.send("evm_mine", []);
        });

        it("can only be called after performUpKeep", async () => {
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(0, lottery.address)
          ).to.be.revertedWith("nonexistent request");
          await expect(
            vrfCoordinatorV2Mock.fulfillRandomWords(1, lottery.address)
          ).to.be.revertedWith("nonexistent request");
        });

        it("picks a winner,resets the lottery and sends ETH", async () => {
          //Create 3 additional dummy players
          const additionalEntrants = 3;
          const startingIndex = 1; //deployer = 0
          const accounts = await ethers.getSigners();

          //connect the address of each of the accounts and enter lottery
          for (
            let i = startingIndex;
            i < startingIndex + additionalEntrants;
            i++
          ) {
            const accountConnectedLottery = lottery.connect(accounts[i]);
            await accountConnectedLottery.enterLottery({ value: entranceFee });
          }
          const startingTimestamp = await lottery.getLatestTimestamp();
          //call performUpKeep(mock being chainlin keepers)
          //fulfillRandomWords(mock being chainlink VRF)
          //wait for fulfillRandomWords to be called
          await new Promise(async (resolve, reject) => {
            lottery.once("WinnerPicked", async () => {
              console.log("Found the event");
              try {
                const recentWinner = await lottery.getRecentWinner();
                console.log(recentWinner);
                console.log(accounts[0].address);
                console.log(accounts[1].address);
                console.log(accounts[2].address);
                console.log(accounts[3].address);
                const lotteryState = await lottery.getLotteryState();
                const endingTimstamp = await lottery.getLatestTimestamp();
                const numPlayers = await lottery.getNumberOfPlayers();
                const winnerEndingBalance = await accounts[1].getBalance();
                assert.equal(numPlayers.toString(), "0");
                assert.equal(lotteryState.toString(), "0");
                assert(endingTimstamp > startingTimestamp);
                assert.equal(
                  winnerEndingBalance.toString(),
                  winnerStartingBalance.add(
                    entranceFee
                      .mul(additionalEntrants)
                      .add(entranceFee)
                      .toString()
                  )
                );
              } catch (error) {
                reject(error);
              }
              resolve();
            });
            const tx = await lottery.performUpkeep([]);
            const txReceipt = await tx.wait(1);
            const winnerStartingBalance = await accounts[1].getBalance();
            await vrfCoordinatorV2Mock.fulfillRandomWords(
              txReceipt.events[1].args.requestId,
              lottery.address
            );
          });
        });
      });
    });
