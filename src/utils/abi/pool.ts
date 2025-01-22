const abi = [
    {
      "inputs": [],
      "name": "liquidity",
      "outputs": [
        {
          "internalType": "uint128",
          "name": "",
          "type": "uint128"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "slot0",
      "outputs": [
        {
          "internalType": "uint160",
          "name": "sqrtPriceX96",
          "type": "uint160"
        },
        {
          "internalType": "int24",
          "name": "tick",
          "type": "int24"
        },
        {
          "internalType": "uint16",
          "name": "observationIndex",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "observationCardinality",
          "type": "uint16"
        },
        {
          "internalType": "uint16",
          "name": "observationCardinalityNext",
          "type": "uint16"
        },
        {
          "internalType": "uint8",
          "name": "feeProtocol",
          "type": "uint8"
        },
        {
          "internalType": "bool",
          "name": "unlocked",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "bool",
          "name": "zeroForOne",
          "type": "bool"
        },
        {
          "internalType": "int256",
          "name": "amountSpecified",
          "type": "int256"
        },
        {
          "internalType": "uint160",
          "name": "sqrtPriceLimitX96",
          "type": "uint160"
        }
      ],
      "name": "swap",
      "outputs": [
        {
          "internalType": "int256",
          "name": "amount0",
          "type": "int256"
        },
        {
          "internalType": "int256",
          "name": "amount1",
          "type": "int256"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "tickSpacing",
      "outputs": [
        {
          "internalType": "int24",
          "name": "",
          "type": "int24"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "fee",
      "outputs": [
        {
          "internalType": "uint24",
          "name": "",
          "type": "uint24"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    }
  ]

  export default abi;