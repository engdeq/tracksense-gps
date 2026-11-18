import { Schema, model, type InferSchemaType } from 'mongoose';

const permissionSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    module: { type: String, required: true },
    description: { type: String, default: '' },
  },
  { timestamps: true },
);

export type PermissionDocument = InferSchemaType<typeof permissionSchema> & {
  _id: Schema.Types.ObjectId;
};
export const Permission = model('Permission', permissionSchema);
