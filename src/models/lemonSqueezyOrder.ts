/**
 * @file lemonSqueezyOrder.ts
 * @description Persistent storage for subscription and order states from Lemon Squeezy.
 * 
 * CORE CONCEPT:
 * This model tracks the "current state" of a user's billing entity. Unlike the 
 * History model which preserves every event, the Order model maintains the 
 * most recent synchronization of order IDs, customer IDs, and subscription 
 * statuses for rapid access by the platform.
 * 
 * Data Flow:
 * 1. Webhooks update this model upon order creation or subscription status changes.
 * 2. The Krvyu Dashboard reads this model to verify a user's current plan and status.
 * 3. Expired/Cancelled states are used to trigger feature-gating in the UI and log storage.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface ILemonSqueezyOrder extends Document {
    /** Reference to the developer (User) who owns this order. */
    user: mongoose.Types.ObjectId;
    /** The unique order identifier assigned by Lemon Squeezy. */
    lsOrderId: string;
    /** The unique subscription identifier (if applicable) assigned by Lemon Squeezy. */
    lsSubscriptionId?: string;
    /** The identifier for the customer record in Lemon Squeezy. */
    lsCustomerId: string;
    /** The internal identifier for the specific price point/plan variant. */
    variantId: string;
    /** The identifier for the core product associated with this order. */
    productId: string;
    /** Current status of the order or subscription (e.g., 'active', 'on_trial', 'expired'). */
    status: string;
    /** human-readable order sequence number from the gateway. */
    orderNumber: number;
    /** Final amount charged in cents/smallest currency unit. */
    total: number;
    /** Three-letter ISO currency code (e.g., 'USD'). */
    currency: string;
    /** Timestamp when the subscription is scheduled to renew. */
    renewsAt?: Date | null;
    /** Timestamp when the subscription or access is scheduled to terminate. */
    endsAt?: Date | null;
    /** Timestamp for the conclusion of the free trial period (if applicable). */
    trialEndsAt?: Date | null;
}

const lemonSqueezyOrderSchema = new Schema<ILemonSqueezyOrder>({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    lsOrderId: {
        type: String,
        required: true,
        unique: true
    },
    lsSubscriptionId: {
        type: String,
        default: null
    },
    lsCustomerId: {
        type: String,
        required: true
    },
    variantId: {
        type: String,
        required: true
    },
    productId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        required: true
    },
    orderNumber: {
        type: Number,
        required: true
    },
    total: {
        type: Number,
        required: true
    },
    currency: {
        type: String,
        required: true
    },
    renewsAt: {
        type: Date,
        default: null
    },
    endsAt: {
        type: Date,
        default: null
    },
    trialEndsAt: {
        type: Date,
        default: null
    }
}, { timestamps: true });

export const LemonSqueezyOrder: Model<ILemonSqueezyOrder> = mongoose.models.LemonSqueezyOrder || mongoose.model<ILemonSqueezyOrder>("LemonSqueezyOrder", lemonSqueezyOrderSchema, "lemonSqueezyOrder");
