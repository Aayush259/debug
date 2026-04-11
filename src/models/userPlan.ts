/**
 * @file userPlan.ts
 * @description Defines the UserPlan schema for the Zag SaaS platform.
 * 
 * CORE CONCEPT:
 * "UserPlan" manages the subscription details and resource quotas for each 
 * developer on the Zag platform. It tracks their current plan level, 
 * activation dates, and remaining balances for various platform services.
 * 
 * Plan Tiers:
 * 1. Hobby: Entry-level plan for individual developers (3 projects, 10 insights, 500 logs).
 * 2. Developer: Pro-tier for growing applications (1000 projects, 500 insights, 2000 logs).
 * 3. Enterprise: Scalable solution for large organizations (5000 projects, 2000 insights, 10000 logs).
 * 
 * Features:
 * - Dynamic Quota Management: Tracks usage of projects, AI insights, and preserved logs.
 * - Plan Lifecycle: Stores start and end dates for subscription period tracking.
 */

import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUserPlan extends Document {
    user: mongoose.Types.ObjectId;
    planType: "hobby" | "developer" | "enterprise";
    planStartDate: Date;
    planEndDate?: Date | null;
    remainingProjects: number;
    remainingFreeInsights: number;
    remainingPreservedLogs: number;
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
        default: 3 // Default for hobby
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
        default: 500 // Default for hobby
    },
    /** The current status of the plan subscription. */
    status: {
        type: String,
        enum: ["active", "expired", "cancelled"],
        default: "active"
    }
}, { timestamps: true });

export const UserPlan: Model<IUserPlan> = mongoose.models.UserPlan || mongoose.model<IUserPlan>("UserPlan", userPlanSchema, "userPlan");
