import { Schema, model, type InferSchemaType } from 'mongoose';

const accessRuleSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    /** Apply to a specific user or role key */
    targetType: { type: String, enum: ['user', 'role'], required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    roleKey: { type: String, default: '' },
    resource: { type: String, required: true, trim: true },
    accessType: {
      type: String,
      enum: ['allow', 'deny', 'read', 'write', 'manage'],
      default: 'allow',
    },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', default: null },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', default: null },
    conditions: { type: Schema.Types.Mixed, default: {} },
    startsAt: { type: Date, default: null },
    expiresAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

accessRuleSchema.index({ isActive: 1, resource: 1 });
accessRuleSchema.index({ targetType: 1, roleKey: 1 });
accessRuleSchema.index({ userId: 1 });

export type AccessRuleDocument = InferSchemaType<typeof accessRuleSchema> & {
  _id: Schema.Types.ObjectId;
};
export const AccessRule = model('AccessRule', accessRuleSchema);
