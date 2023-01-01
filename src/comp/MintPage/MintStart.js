import {
    useActiveClaimConditionForWallet,
    useAddress,
    useClaimConditions,
    useClaimedNFTSupply,
    useClaimerProofs,
    useClaimIneligibilityReasons,
    useContract,
    useContractMetadata,
    useUnclaimedNFTSupply,
    Web3Button,
} from "@thirdweb-dev/react";
import { BigNumber, utils } from "ethers";

import { useMemo, useState } from "react";
import styles from "./Theme.module.css";
import { parseIneligibility } from "./parseIneligibility";

// Put Your NFT Drop Contract address from the dashboard here
const myNftDropContractAddress = "0x710E9161e8A768c0605335AB632361839f761374";

const MintStart = () => {
    const { contract: nftDrop } = useContract(myNftDropContractAddress);

    const address = useAddress();
    const [quantity, setQuantity] = useState(1);

    const { data: contractMetadata } = useContractMetadata(nftDrop);

    const claimConditions = useClaimConditions(nftDrop);

    const activeClaimCondition = useActiveClaimConditionForWallet(
        nftDrop,
        address || ""
    );
    const claimerProofs = useClaimerProofs(nftDrop, address || "");
    const claimIneligibilityReasons = useClaimIneligibilityReasons(nftDrop, {
        quantity,
        walletAddress: address || "",
    });
    const unclaimedSupply = useUnclaimedNFTSupply(nftDrop);
    const claimedSupply = useClaimedNFTSupply(nftDrop);

    const numberClaimed = useMemo(() => {
        return BigNumber.from(claimedSupply.data || 0).toString();
    }, [claimedSupply]);

    const numberTotal = useMemo(() => {
        return BigNumber.from(claimedSupply.data || 0)
            .add(BigNumber.from(unclaimedSupply.data || 0))
            .toString();
    }, [claimedSupply.data, unclaimedSupply.data]);

    const priceToMint = useMemo(() => {
        const bnPrice = BigNumber.from(
            activeClaimCondition.data?.currencyMetadata.value || 0
        );
        return `${utils.formatUnits(
            bnPrice.mul(quantity).toString(),
            activeClaimCondition.data?.currencyMetadata.decimals || 18
        )} ${activeClaimCondition.data?.currencyMetadata.symbol}`;
    }, [
        activeClaimCondition.data?.currencyMetadata.decimals,
        activeClaimCondition.data?.currencyMetadata.symbol,
        activeClaimCondition.data?.currencyMetadata.value,
        quantity,
    ]);

    const maxClaimable = useMemo(() => {
        let bnMaxClaimable;
        try {
            bnMaxClaimable = BigNumber.from(
                activeClaimCondition.data?.maxClaimableSupply || 0
            );
        } catch (e) {
            bnMaxClaimable = BigNumber.from(1_000_000);
        }

        let perTransactionClaimable;
        try {
            perTransactionClaimable = BigNumber.from(
                activeClaimCondition.data?.maxClaimablePerWallet || 0
            );
        } catch (e) {
            perTransactionClaimable = BigNumber.from(1_000_000);
        }

        if (perTransactionClaimable.lte(bnMaxClaimable)) {
            bnMaxClaimable = perTransactionClaimable;
        }

        const snapshotClaimable = claimerProofs.data?.maxClaimable;

        if (snapshotClaimable) {
            if (snapshotClaimable === "0") {
                // allowed unlimited for the snapshot
                bnMaxClaimable = BigNumber.from(1_000_000);
            } else {
                try {
                    bnMaxClaimable = BigNumber.from(snapshotClaimable);
                } catch (e) {
                    // fall back to default case
                }
            }
        }

        const maxAvailable = BigNumber.from(unclaimedSupply.data || 0);

        let max;
        if (maxAvailable.lt(bnMaxClaimable)) {
            max = maxAvailable;
        } else {
            max = bnMaxClaimable;
        }

        if (max.gte(1_000_000)) {
            return 1_000_000;
        }
        return max.toNumber();
    }, [
        claimerProofs.data?.maxClaimable,
        unclaimedSupply.data,
        activeClaimCondition.data?.maxClaimableSupply,
        activeClaimCondition.data?.maxClaimablePerWallet,
    ]);

    const isSoldOut = useMemo(() => {
        try {
            return (
                (activeClaimCondition.isSuccess &&
                    BigNumber.from(activeClaimCondition.data?.availableSupply || 0).lte(
                        0
                    )) ||
                numberClaimed === numberTotal
            );
        } catch (e) {
            return false;
        }
    }, [
        activeClaimCondition.data?.availableSupply,
        activeClaimCondition.isSuccess,
        numberClaimed,
        numberTotal,
    ]);

    console.log("claimIneligibilityReasons", claimIneligibilityReasons.data);

    const canClaim = useMemo(() => {
        return (
            activeClaimCondition.isSuccess &&
            claimIneligibilityReasons.isSuccess &&
            claimIneligibilityReasons.data?.length === 0 &&
            !isSoldOut
        );
    }, [
        activeClaimCondition.isSuccess,
        claimIneligibilityReasons.data?.length,
        claimIneligibilityReasons.isSuccess,
        isSoldOut,
    ]);

    const isLoading = useMemo(() => {
        return (
           
            !nftDrop
        );
    }, [
      
        nftDrop,
        
    ]);

    const buttonLoading = useMemo(
        () => isLoading || claimIneligibilityReasons.isLoading,
        [claimIneligibilityReasons.isLoading, isLoading]
    );
    const buttonText = useMemo(() => {
        if (isSoldOut) {
            return "Sold Out";
        }

        if (canClaim) {
            const pricePerToken = BigNumber.from(
                activeClaimCondition.data?.currencyMetadata.value || 0
            );
            if (pricePerToken.eq(0)) {
                return "Mint (Free)";
            }
            return `Mint (${priceToMint})`;
        }
        if (claimIneligibilityReasons.data?.length) {
            return parseIneligibility(claimIneligibilityReasons.data, quantity);
        }
        if (buttonLoading) {
            return "Checking eligibility...";
        }

        return "Claiming not available";
    }, [
        isSoldOut,
        canClaim,
        claimIneligibilityReasons.data,
        buttonLoading,
        activeClaimCondition.data?.currencyMetadata.value,
        priceToMint,
        quantity,
    ]);



    return (

        <div className={
            styles.container
        }

        >
            <div className={
                styles.mintInfoContainer
            }

            > {
                    isLoading ? (
                        <h3 style={{ color: "white", textAlign: "center" }}>Loading...</h3>
                    ) : (
                        <>


                            <div >
                                {/* Image Preview of NFTs */}


                                    <h3 style={{ color: "white", textAlign: "center", marginBottom: "20px" }}>
                                        Claim Your Free Nft Now</h3>
                                {/* Amount claimed so far */}
<h4 style={{ color: "white", textAlign: "center", marginBottom: "20px" }}>
                                           (Connect wallet or download new wallet to get started)</h4>
                                    <div className={styles.mintCompletionArea}>
                                        
                                    <div className={styles.mintAreaLeft}>
                                            <h4 style={{ color: "white", textAlign: "center",  }}>
                                            Total Minted</h4>
                                        </div>
                                        
                                    <div className={styles.mintAreaRight}>
                                        {claimedSupply && unclaimedSupply ? (
                                            <h6 style={{ color: "white", textAlign: "center" }}>
                                                    {numberClaimed} { "/" } {numberTotal}
                                            </h6>
                                        ) : (
                                            // Show loading state if we're still loading the supply
                                            <p>Loading...</p>
                                        )}
                                    </div>
                                </div>

                                {claimConditions.data?.length === 0 ||
                                    claimConditions.data?.every(
                                        (cc) => cc.maxClaimableSupply === "0"
                                    ) ? (
                                    <div>
                                        <h2>
                                            Already Claimed 1 free NFT
                                        </h2>
                                    </div>
                                ) : (
                                    <>


                                        <div className={styles.mintContainer}>
                                            {isSoldOut ? (
                                                <div>
                                                    <h2>Sold Out</h2>
                                                </div>
                                            ) : (
                                                <Web3Button
                                                    contractAddress={nftDrop?.getAddress() || ""}
                                                    action={(cntr) => cntr.erc721.claim(quantity)}
                                                    isDisabled={!canClaim || buttonLoading}
                                                    onError={(err) => {
                                                        console.error(err);
                                                        alert("Error claiming NFTs");
                                                    }}
                                                    onSuccess={() => {
                                                        setQuantity(1);
                                                        alert("Successfully claimed NFTs");
                                                    }}
                                                >
                                                                {buttonLoading ? "Loading..." : buttonText}
                                                </Web3Button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </>
                    )
                }

            </div >

        </div >
    );
};

export default MintStart;