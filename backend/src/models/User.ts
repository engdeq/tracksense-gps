import { Schema, model, type InferSchemaType, type HydratedDocument, type Model } from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true, lowercase: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, default: '' },
    avatarUrl: { type: String, default: '' },
    roleKey: {
      type: String,
      enum: [
        'super_admin',
        'admin',
        'country_manager',
        'city_manager',
        'supervisor',
        'operator',
        'customer',
      ],
      required: true,
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', default: null },
    countryId: { type: Schema.Types.ObjectId, ref: 'Country', default: null },
    cityId: { type: Schema.Types.ObjectId, ref: 'City', default: null },
    isActive: { type: Boolean, default: true },
    lockedUntil: { type: Date, default: null },
    lockReason: { type: String, default: '' },
    failedLoginAttempts: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    passwordResetToken: { type: String, default: null, select: false },
    passwordResetExpires: { type: Date, default: null, select: false },
  },
  { timestamps: true },
);

userSchema.index({ roleKey: 1, isActive: 1 });
userSchema.index({ customerId: 1 });

userSchema.methods.comparePassword = async function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
};

export interface IUserMethods {
  comparePassword(password: string): Promise<boolean>;
}

export interface UserModel extends Model<InferSchemaType<typeof userSchema>, object, IUserMethods> {
  hashPassword(password: string): Promise<string>;
}

export type UserDocument = HydratedDocument<InferSchemaType<typeof userSchema>, IUserMethods>;

export const User = model<InferSchemaType<typeof userSchema>, UserModel>('User', userSchema);
