import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["super_admin"], default: "super_admin" },
});

export default mongoose.model("User", UserSchema);
