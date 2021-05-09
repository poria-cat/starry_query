import { SubstrateExtrinsic, SubstrateEvent } from "@subql/types";
import { collection } from '../types/models/collection';
import { nft } from '../types/models/nft';
import { order } from '../types/models/order';
import { NFTTransferred, NFTMint, FTMint } from '../utils/token';

export async function handleSellNFT(event: SubstrateEvent): Promise<void> {
    const { event: { data: [order_id] } } = event;
    const { extrinsic: { method: { args: [collection_id, token_id, amount, price] } } } = event.extrinsic;

    const orderRecord = new order(order_id.toString());
    orderRecord.nftId = `${collection_id.toString()}-${token_id.toString()}`
    orderRecord.price = BigInt(price);
    orderRecord.amount = BigInt(amount);
    orderRecord.seller = event.extrinsic.extrinsic.signer.toString();
    
    // exchange_pallet: 5EYCAe5a7x69hFY9TwczDWDhJMHXGirtzHzfYnnmc3WmBTFZ

    await NFTTransferred("5EYCAe5a7x69hFY9TwczDWDhJMHXGirtzHzfYnnmc3WmBTFZ", collection_id, token_id, amount);
    await orderRecord.save();
}

export async function handleBuyNFT(event: SubstrateEvent): Promise<void> {
    const { event: { data: [left_amount] } } = event;
    const { extrinsic: { method: { args: [order_id, amount] } } } = event.extrinsic;

    if (BigInt(left_amount) === BigInt(0)) {
        await order.remove(order_id.toString());
    } else {
        const orderRecord = await order.get(order_id.toString());
        const token = orderRecord.nftId.split("-");
        await NFTTransferred(event.extrinsic.extrinsic.signer.toString(), token[0], token[1], amount);
        const startIdx = BigInt(token[1]) + BigInt(amount);
        const newNodeId = `${token[0]}-${startIdx.toString()}`;
        orderRecord.amount = BigInt(left_amount);
        orderRecord.nftId = newNodeId;

        await orderRecord.save();
    }
}

export async function handleCancelNFTOrder(event: SubstrateEvent): Promise<void> {
    const { event: { data: [order_id] } } = event;
    const orderRecord = await order.get(order_id.toString());
    const token = orderRecord.nftId.split("-");
    const collection_id = token[0];
    const token_id = token[1];
    const amount = orderRecord.amount;
    await NFTTransferred(event.extrinsic.extrinsic.signer.toString(), collection_id, token_id, amount);
    await order.remove(order_id.toString());
}