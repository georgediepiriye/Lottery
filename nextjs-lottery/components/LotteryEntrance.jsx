import { useEffect, useState } from "react";
import { useWeb3Contract } from "react-moralis";
import { useMoralis } from "react-moralis";
import { ethers } from "ethers";
import { useNotification } from "web3uikit";
import styles from "../styles/Home.module.css";

export default function LotteryEntrance() {
  const { isWeb3Enabled } = useMoralis();
  const abi = [
    {
      inputs: [
        {
          internalType: "address",
          name: "vrfCoodinatorV2",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "entranceFee",
          type: "uint256",
        },
        {
          internalType: "bytes32",
          name: "gasLane",
          type: "bytes32",
        },
        {
          internalType: "uint64",
          name: "subscriptionId",
          type: "uint64",
        },
        {
          internalType: "uint32",
          name: "callbackGasLimit",
          type: "uint32",
        },
        {
          internalType: "uint256",
          name: "interval",
          type: "uint256",
        },
      ],
      stateMutability: "nonpayable",
      type: "constructor",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "have",
          type: "address",
        },
        {
          internalType: "address",
          name: "want",
          type: "address",
        },
      ],
      name: "OnlyCoordinatorCanFulfill",
      type: "error",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "player",
          type: "address",
        },
      ],
      name: "LotteryEnter",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "requestId",
          type: "uint256",
        },
      ],
      name: "RequestedLotteryWinner",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "winner",
          type: "address",
        },
      ],
      name: "WinnerPicked",
      type: "event",
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "",
          type: "bytes",
        },
      ],
      name: "checkUpkeep",
      outputs: [
        {
          internalType: "bool",
          name: "upkeepNeeded",
          type: "bool",
        },
        {
          internalType: "bytes",
          name: "",
          type: "bytes",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "enterLottery",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [],
      name: "getEntranceFee",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getInterval",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getLatestTimestamp",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getLotteryState",
      outputs: [
        {
          internalType: "enum Lottery.LotteryState",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getNumWords",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [],
      name: "getNumberOfPlayers",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "index",
          type: "uint256",
        },
      ],
      name: "getPlayer",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getRecentWinner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getRequestConfirmations",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "pure",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes",
          name: "",
          type: "bytes",
        },
      ],
      name: "performUpkeep",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "requestId",
          type: "uint256",
        },
        {
          internalType: "uint256[]",
          name: "randomWords",
          type: "uint256[]",
        },
      ],
      name: "rawFulfillRandomWords",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ];
  const address = "0xf67f046e4cf2a7f1c554f61e0f812300fb22a598";
  const [entranceFee, setEntranceFee] = useState("0");
  const [numberOfPlayers, setNumberOfPlayers] = useState("0");
  const [recentWinner, setRecentWinner] = useState("0");
  const dispatch = useNotification();

  const { runContractFunction: enterLottery } = useWeb3Contract({
    abi: abi,
    contractAddress: address,
    functionName: "enterLottery",
    params: {},
    msgValue: entranceFee,
  });

  const { runContractFunction: getEntranceFee } = useWeb3Contract({
    abi: abi,
    contractAddress: address,
    functionName: "getEntranceFee",
    params: {},
  });

  const { runContractFunction: getNumberOfPlayers } = useWeb3Contract({
    abi: abi,
    contractAddress: address,
    functionName: "getNumberOfPlayers",
    params: {},
  });

  const { runContractFunction: getRecentWinner } = useWeb3Contract({
    abi: abi,
    contractAddress: address,
    functionName: "getRecentWinner",
    params: {},
  });

  async function updateUi() {
    const fee = (await getEntranceFee()).toString();
    const numberOfPlayers = (await getNumberOfPlayers()).toString();
    const recentWinner = (await getRecentWinner()).toString();
    setEntranceFee(fee);
    setNumberOfPlayers(numberOfPlayers);
    setRecentWinner(recentWinner);
  }

  //we use useEffect to first call getEntranceFee to get entrance fee
  useEffect(() => {
    if (isWeb3Enabled) {
      updateUi();
    }
  }, [isWeb3Enabled]);

  const handleSuccess = async function (tx) {
    await tx.wait(1);
    handleNewNotification(tx);
    updateUi();
  };

  const handleNewNotification = function () {
    dispatch({
      type: "info",
      message: "Transaction Complete!",
      title: "Transaction Notification",
      position: "topR",
      icon: "bell",
    });
  };

  return (
    <div>
      {address ? (
        <div>
          <div className={styles.description}>
            Hi! the entrance fee is :{" "}
            {ethers.utils.formatUnits(entranceFee, "ether")}
            ETH
          </div>
          <div className={styles.description}>Players: {numberOfPlayers}</div>
          <div className={styles.description}>
            Recent Winner: {recentWinner}
          </div>
          <div className={styles.buttonContainer}>
            <button
              className={styles.button}
              onClick={async function () {
                await enterLottery({
                  onSuccess: handleSuccess,
                  onError: (error) => console.log(error),
                });
              }}
            >
              Enter Lottery
            </button>
          </div>
        </div>
      ) : (
        <div>No Lottery address detected</div>
      )}
    </div>
  );
}
