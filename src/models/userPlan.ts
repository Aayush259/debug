/**
 * @file userPlan.ts
 * @description Defines the UserPlan schema for the platform.
 * 
 * CORE CONCEPT:
 * "UserPlan" manages subscription details and resource quotas for each developer.
 * It tracks plan levels, activation dates, and account-wide resource balances.
 * 
 * Subscription Lifecycle:
 * - ACTIVE: User has full access to plan features.
 * - CANCELLED: Pending expiration at the end of the current billing cycle. User 
 *   retains premium access until the expiration date.
 * - EXPIRED: Subscription has ended. The system automatically resets the plan 
 *   to 'hobby', clears the end date, and revokes premium features.
 * 
 * Resource Enforcement:
 * - Active Project Gating: Restricts log ingestion to the oldest N projects.
 * - Global Log Rotation: Rotates oldest logs account-wide to stay within quotas.
 * - AI Insights: Tracks monthly usage vs free/BYOK quotas.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserPlan extends Document {
    user: mongoose.Types.ObjectId;
    planType: TPlanType;
    planStartDate: Date;
    planEndDate?: Date | null;
    remainingProjects: number;
    remainingFreeInsights: number;
    remainingPreservedLogs: number;
    totalProjects: number;
    totalFreeInsights: number;
    totalPreservedLogs: number;
    price: number;
    byok: boolean;
    emailAlerts: boolean;
    status: "active" | "expired" | "cancelled";
    createdAt: Date;
    updatedAt: Date;
}

const userPlanSchema = new Schema<IUserPlan>({
    /** Reference to the developer (User) this plan belongs to. */
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        unique: true
    },
    /** The subscription tier selected by the user. */
    planType: {
        type: String,
        enum: ["hobby", "developer", "enterprise"],
        default: "hobby",
        required: true
    },
    /** The date when the current plan subscription started. */
    planStartDate: {
        type: Date,
        default: Date.now,
        required: true
    },
    /** 
     * The date when the current plan subscription expires. 
     * For 'hobby' plan, this can be null (infinite timeline).
     */
    planEndDate: {
        type: Date,
        default: null
    },
    /** Remaining number of projects the user can create. */
    remainingProjects: {
        type: Number,
        required: true,
        default: 1 // Default for hobby
    },
    /** Remaining number of AI insights (from free quota) available this month. */
    remainingFreeInsights: {
        type: Number,
        required: true,
        default: 10 // Default for hobby
    },
    /** Remaining number of logs per project that will be preserved for the developer. */
    remainingPreservedLogs: {
        type: Number,
        required: true,
        default: 200 // Default for hobby
    },
    /** Total number of projects the user can create. */
    totalProjects: {
        type: Number,
        required: true,
        default: 1 // Default for hobby
    },
    /** Total number of AI insights the user can get per month. */
    totalFreeInsights: {
        type: Number,
        required: true,
        default: 10 // Default for hobby
    },
    /** Total number of logs per project that will be preserved for the developer. */
    totalPreservedLogs: {
        type: Number,
        required: true,
        default: 500 // Default for hobby
    },
    /** The price of the plan subscription. */
    price: {
        type: Number,
        required: true,
        default: 0 // Default for hobby
    },
    /** 
     * Flag to determine if the user is allowed to use their own API keys (Bring Your Own Key).
     * This is typically disabled for the Hobby plan.
     */
    byok: {
        type: Boolean,
        default: false
    },
    /** 
     * Flag to determine if the user's plan supports off-platform email alerts for error logs.
     * This is typically disabled for the Hobby plan.
     */
    emailAlerts: {
        type: Boolean,
        default: false
    },
    /** The current status of the plan subscription. */
    status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active"
    }
}, { timestamps: true });

export const UserPlan: Model<IUserPlan> = mongoose.models.UserPlan || mongoose.model<IUserPlan>("UserPlan", userPlanSchema, "userPlan");
