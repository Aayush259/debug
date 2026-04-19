/**
 * @file lemonSqueezyHistory.ts
 * @description Audit trail for all incoming Lemon Squeezy webhook events.
 * 
 * CORE CONCEPT:
 * This model serves as the source-of-truth log for all financial events 
 * occurring within the payment gateway. It stores raw payloads for every 
 * webhook received, facilitating debugging, reconciliation, and audit logs.
 * 
 * Usage:
 * - Debugging: Resolving issues where a user's plan didn't update as expected.
 * - Recovery: Replaying events if a database failure occurs.
 * - Monitoring: Tracking the volume and types of billing events over time.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILemonSqueezyHistory extends Document {
    /** Reference to the developer (User) associated with this billing event. */
    user: mongoose.Types.ObjectId;
    /** The external identifier (Order ID or Subscription ID) from Lemon Squeezy. */
    lsId: string;
    /** The specific webhook event name (e.g., 'order_created', 'subscription_cancelled'). */
    event: string;
    /** The complete, un-sanitized raw payload received from the webhook. */
    payload: any;
}

const lemonSqueezyHistorySchema = new Schema<ILemonSqueezyHistory>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    lsId: {
        type: String,
        required: true,
    },
    event: {
        type: String,
        required: true
    },
    payload: {
        type: Schema.Types.Mixed,
        required: true
    }
}, { timestamps: true });

// Indexing strategy to optimize audit lookups and event filtering.
lemonSqueezyHistorySchema.index({ user: 1, lsId: 1 });
lemonSqueezyHistorySchema.index({ event: 1 });

export const LemonSqueezyHistory: Model<ILemonSqueezyHistory> = mongoose.models.LemonSqueezyHistory || mongoose.model<ILemonSqueezyHistory>("LemonSqueezyHistory", lemonSqueezyHistorySchema, "lemonSqueezyHistory");
