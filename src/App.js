import React, { useState, useEffect } from 'react';
import { Connection, Keypair, SystemProgram, Transaction, PublicKey } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const getProvider = () => {
    if ("solana" in window) {
        const provider = window.solana;
        if (provider.isPhantom) {
            return provider;
        }
    }
    // window.open("https://phantom.app/", "_blank");
};

async function generatePDA(
    tokenMint,
    addEditionToSeeds = false
) {

    const metadataSeeds = [
        Buffer.from("metadata"),  // METADATA_PREFIX
        new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(),    // METADATA_PROGRAM_ID
        tokenMint.toBuffer(),
    ];

    if (addEditionToSeeds) {
        metadataSeeds.push(Buffer.from("edition"));
    }

    return (
        await PublicKey.findProgramAddress(
            metadataSeeds,
            new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")    // METADATA_PROGRAM_ID
        )
    )[0];
}

function App(dataLength, commitment) {
    const provider = getProvider();
    const [publicKey, setpublicKey] = useState(null);
    const [phantomConnect, setPhantomConnect] = useState(false);
    const connection = new Connection('https://api.devnet.solana.com');
//     const connection = new Connection('https://api.mainnet-beta.solana.com');

    const connect = async () => {
        const resp = await window.solana.connect();
        setPhantomConnect(true);
        setpublicKey(resp.publicKey.toString());

        // Test script to retrieve all assets of the address
        const nftItems = [];
        const testPubkey = new PublicKey("DHgHbmUXmbPK5NGhzAQLJ22XYSseatVPonwtjtAqqnBK");
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(testPubkey, { programId: TOKEN_PROGRAM_ID });
        for (let i = 0; i < tokenAccounts.value.length; i++) {
            const pubKey = tokenAccounts.value[i].pubkey;
            const info = tokenAccounts.value[i].account.data.parsed.info
            if (info.tokenAmount.decimals === 0 && info.tokenAmount.amount === "1") {
                const metadataKey = await generatePDA(new PublicKey(info.mint));
                const accountInfo = await connection.getAccountInfo(metadataKey);
                if (accountInfo && accountInfo.data.length > 0) {
                    // const metadata = decodeMetadata(accountInfo.data);
                    nftItems.push({
                        account: pubKey.toString(),
                        mint: info.mint,
                        // metadata
                    })
                }
            }
        }

        console.log("nftItems", nftItems)
        // script ends
    };

    const disconnect = async () => {
        window.solana.disconnect().then(() => {
            setPhantomConnect(false);
            setpublicKey(null);
        });
    };

    useEffect(() => {
        if (provider) {
            provider.on("connect", () => {
                setPhantomConnect(true);
                setpublicKey(provider.publicKey?.toString());

            });
            provider.on("disconnect", () => {
                setPhantomConnect(false);

            });
            // try to eagerly connect
            provider.connect({ onlyIfTrusted: true });
            return () => {
                provider.disconnect();
            };
        }
    }, [provider]);


    const sendTransaction = async () => {

        // Create a Transaction!
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: window.solana.publicKey,
                toPubkey: 'DGLyGabZHc2Xb7znZD9FiQouYjtb52dgeZEcGY37uvng',
                lamports: 1000000000,
            })
        );
        transaction.feePayer = window.solana.publicKey;
        transaction.recentBlockhash = (
            await connection.getRecentBlockhash()
        ).blockhash;


        if (transaction) {
            try {

                // Signed the Transaction Using Phantom!
                let signed = await provider.signTransaction(transaction);

                console.log("Got signature, submitting transaction");

                // Send a Transaction!
                let signature = await connection.sendRawTransaction(signed.serialize());

                // Wait the Transaction!
                await connection.confirmTransaction(signature).then(() => {
                    console.log("Transaction Succeed!");
                    console.log(signature);
                });


            } catch (err) {
                console.log(err);
                console.log("Error: " + JSON.stringify(err));
            }
        }
    };


    return (
        <div className="container-fluid">
            <div className="container text-center mt-5">
                <h1>Claim NFT</h1>
                {publicKey && (
                    <div>
                        {publicKey}
                    </div>
                )}

                {!phantomConnect ? (
                    <button className="btn btn-primary" onClick={connect}>Connect</button>
                ) : (
                    <div>
                        <button className="btn btn-danger m-3" onClick={disconnect}>Disconect</button>

                        <button className="btn btn-warning m-3" onClick={sendTransaction}>Transaction</button>

                    </div>
                )}


            </div>
        </div>
    );
}

export default App;
