import { Schema, model, type InferSchemaType } from 'mongoose';

const rolePermissionSchema = new Schema(
  {
    roleId: { type: Schema.Types.ObjectId, ref: 'Role', required: true },
    permissionId: { type: Schema.Types.ObjectId, ref: 'Permission', required: true },
  },
  { timestamps: true },
);

rolePermissionSchema.index({ roleId: 1, permissionId: 1 }, { unique: true });

export type RolePermissionDocument = InferSchemaType<typeof rolePermissionSchema> & {
  _id: Schema.Types.ObjectId;
};
export const RolePermission = model('RolePermission', rolePermissionSchema);
