# Verified final KeeperHub execution

Status: **completed and independently verifiable**

This is the final hackathon release evidence. It is separate from the earlier
pre-event onboarding transaction.

| Field | Verified value |
| --- | --- |
| Network | Ethereum Sepolia |
| Chain ID | `11155111` |
| Sender / authorized target | `0x9b5f9ac9bd9e178962a50582f2b42b5523fcd042` |
| Recipient | `0x7c1569bf1384d6ffec460ac36b671c2998fdcffb` |
| Amount | `0.000001 ETH` (`1000000000000` wei) |
| KeeperHub status | `completed` |
| Transaction hash | `0xfcb18018db0969f984489332ee605f532acb052ce8a22b88880ef95147288975` |
| Public receipt | [Sepolia Etherscan](https://sepolia.etherscan.io/tx/0xfcb18018db0969f984489332ee605f532acb052ce8a22b88880ef95147288975) |
| Audit records | `8` |
| Audit head | `7781ff8fd7ab794777ae3d9189960d7e5825ff39db38f83fc02a3f0a3665ebaa` |

## Safety and recovery evidence

The public redacted audit is [`audit/final-release.jsonl`](../../audit/final-release.jsonl).
Its ordered events are:

```text
condition → simulation → confirmation → retry → retry → submit → status → receipt
```

Both retry rows carry the same redacted idempotency digest. The audited release
contains one submit, one completed execution, and one transaction hash. No raw
idempotency key, organization credential, OAuth material, private key, or
private execution state is present in this file or the public audit.

The exact confirmation phrase is plan-digest-bound and must be entered in a
real TTY. The audit records the confirmation event and safe suffix, but it does
not claim to establish the operator's legal identity.

## How the public receipt is interpreted

Etherscan reports `Success` on Sepolia and classifies the transaction as
EIP-7702. KeeperHub's execution uses a relayer/delegated outer transaction, so
the top-level `from`, `to`, and `value` do not directly equal the release
intent.

Independent verification therefore combines:

1. the successful receipt and exact transaction hash;
2. decoded `execute(address _target,address _to,uint256 _ethAmount,bytes _data)`
   input, where `_target` is the authorized sender, `_to` is the recipient, and
   `_ethAmount` is `0xe8d4a51000` (`1000000000000` wei); and
3. Etherscan state differences showing the authorized sender changing from
   `0.05 ETH` to `0.049999 ETH`, a `0.000001 ETH` decrease, with the recipient
   address present in the same state-difference view.

This evidence does not reuse the transaction ending `...6352`; that receipt is
pre-event onboarding evidence only.
