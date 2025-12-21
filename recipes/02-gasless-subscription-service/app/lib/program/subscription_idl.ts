export type SubscriptionProgram = {
  "version": "0.1.0",
  "name": "subscription_program",
  "instructions": [
    {
      "name": "initializeSubscription",
      "accounts": [
        { "name": "subscription", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "recipient", "isMut": false, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "recipientTokenAccount", "isMut": false, "isSigner": false },
        { "name": "tokenMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "payer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amountPerPeriod", "type": "u64" },
        { "name": "intervalSeconds", "type": "i64" },
        { "name": "expiresAt", "type": { "option": "i64" } }
      ]
    },
    {
      "name": "chargeSubscription",
      "accounts": [
        { "name": "subscription", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "recipientTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "cancelSubscription",
      "accounts": [
        { "name": "subscription", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Subscription",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "recipient", "type": "publicKey" },
          { "name": "userTokenAccount", "type": "publicKey" },
          { "name": "recipientTokenAccount", "type": "publicKey" },
          { "name": "tokenMint", "type": "publicKey" },
          { "name": "amountPerPeriod", "type": "u64" },
          { "name": "intervalSeconds", "type": "i64" },
          { "name": "lastChargeTimestamp", "type": "i64" },
          { "name": "createdAt", "type": "i64" },
          { "name": "expiresAt", "type": { "option": "i64" } },
          { "name": "isActive", "type": "bool" },
          { "name": "totalCharged", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "SubscriptionInactive", "msg": "Subscription is not active" },
    { "code": 6001, "name": "SubscriptionExpired", "msg": "Subscription has expired" },
    { "code": 6002, "name": "IntervalNotMet", "msg": "Not enough time has passed since last charge" },
    { "code": 6003, "name": "SubscriptionAlreadyCancelled", "msg": "Subscription already cancelled" },
    { "code": 6004, "name": "InvalidTokenAccount", "msg": "Invalid token account - must be owned by Token Program" }
  ]
};

export const IDL: SubscriptionProgram = {
  "version": "0.1.0",
  "name": "subscription_program",
  "instructions": [
    {
      "name": "initializeSubscription",
      "accounts": [
        { "name": "subscription", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "recipient", "isMut": false, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "recipientTokenAccount", "isMut": false, "isSigner": false },
        { "name": "tokenMint", "isMut": false, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false },
        { "name": "payer", "isMut": true, "isSigner": true },
        { "name": "systemProgram", "isMut": false, "isSigner": false }
      ],
      "args": [
        { "name": "amountPerPeriod", "type": "u64" },
        { "name": "intervalSeconds", "type": "i64" },
        { "name": "expiresAt", "type": { "option": "i64" } }
      ]
    },
    {
      "name": "chargeSubscription",
      "accounts": [
        { "name": "subscription", "isMut": true, "isSigner": false },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "recipientTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    },
    {
      "name": "cancelSubscription",
      "accounts": [
        { "name": "subscription", "isMut": true, "isSigner": false },
        { "name": "authority", "isMut": false, "isSigner": true },
        { "name": "userTokenAccount", "isMut": true, "isSigner": false },
        { "name": "tokenProgram", "isMut": false, "isSigner": false }
      ],
      "args": []
    }
  ],
  "accounts": [
    {
      "name": "Subscription",
      "type": {
        "kind": "struct",
        "fields": [
          { "name": "authority", "type": "publicKey" },
          { "name": "recipient", "type": "publicKey" },
          { "name": "userTokenAccount", "type": "publicKey" },
          { "name": "recipientTokenAccount", "type": "publicKey" },
          { "name": "tokenMint", "type": "publicKey" },
          { "name": "amountPerPeriod", "type": "u64" },
          { "name": "intervalSeconds", "type": "i64" },
          { "name": "lastChargeTimestamp", "type": "i64" },
          { "name": "createdAt", "type": "i64" },
          { "name": "expiresAt", "type": { "option": "i64" } },
          { "name": "isActive", "type": "bool" },
          { "name": "totalCharged", "type": "u64" },
          { "name": "bump", "type": "u8" }
        ]
      }
    }
  ],
  "errors": [
    { "code": 6000, "name": "SubscriptionInactive", "msg": "Subscription is not active" },
    { "code": 6001, "name": "SubscriptionExpired", "msg": "Subscription has expired" },
    { "code": 6002, "name": "IntervalNotMet", "msg": "Not enough time has passed since last charge" },
    { "code": 6003, "name": "SubscriptionAlreadyCancelled", "msg": "Subscription already cancelled" },
    { "code": 6004, "name": "InvalidTokenAccount", "msg": "Invalid token account - must be owned by Token Program" }
  ]
};
