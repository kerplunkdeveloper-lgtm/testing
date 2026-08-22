import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import {
  FiCamera, FiMail, FiPhone, FiSave, FiUser, FiTrash2,
} from "react-icons/fi";
import {
  getProfile, createProfile, updateProfile,
  deleteProfileImage, optimisticProfileUpdate,
} from "../../features/profile/profileSlice";

const INFO_ROWS = [
  { icon: FiMail,   color: "bg-blue-50 text-blue-500",    label: "Email",   key: "email",   fromUser: true },
  { icon: FiPhone,  color: "bg-emerald-50 text-emerald-500", label: "Phone",   key: "phone",   fromUser: false },
];

const Profile = () => {
  const dispatch = useDispatch();
  const { user }    = useSelector((s) => s.auth);
  const { profile, loading } = useSelector((s) => s.profile);

  const [formData, setFormData] = useState({ bio: "", phone: "" });
  const [image, setImage]             = useState(null);
  const [previewImage, setPreviewImage] = useState("");

  useEffect(() => {
    if (!profile && !loading) {
      dispatch(getProfile());
    }
  }, [dispatch, user]);

  useEffect(() => {
    if (profile) setFormData({ bio: profile.bio || "", phone: profile.phone || "" });
  }, [profile]);

  useEffect(() => () => { if (previewImage) URL.revokeObjectURL(previewImage); }, [previewImage]);

  const handleChange = (e) => setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) { setImage(file); setPreviewImage(URL.createObjectURL(file)); }
  };

  const handleDeleteImage = () => {
    dispatch(deleteProfileImage());
    setPreviewImage(""); setImage(null);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData();
    data.append("bio", formData.bio);
    data.append("phone", formData.phone);
    if (image) data.append("image", image);

    const optimistic = { ...formData };
    if (previewImage) optimistic.profileImage = { url: previewImage };
    dispatch(optimisticProfileUpdate(optimistic));

    toast.promise(
      dispatch(profile ? updateProfile(data) : createProfile(data)).unwrap(),
      {
        loading: "Saving...",
        success: "Profile updated!",
        error: (err) => `Failed: ${typeof err === 'object' ? JSON.stringify(err) : (err || "Unknown error")}`,
      }
    );
  };

  const avatarSrc = previewImage || profile?.profileImage?.url;

  return (
    <div className="min-h-screen bg-gray-50/50 max-w-5xl mx-auto">
      <div className=" px-3 sm:px-5 py-4 sm:py-6">

        {/* PAGE TITLE */}
        <div className="mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-slate-800 dark:text-yellow-50">My Profile</h1>
          <p className="text-xs text-gray-400">Manage your personal information</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-4">

          {/* ── LEFT CARD ── */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm flex flex-col items-center text-center">

            {/* AVATAR */}
            <div className="relative mb-4">
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 border-4 border-white shadow-md flex items-center justify-center">
                  <FiUser size={36} className="text-slate-400" />
                </div>
              )}

              {/* Camera */}
              <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center cursor-pointer shadow-md transition-all">
                <FiCamera size={14} />
                <input type="file" hidden accept="image/*" onChange={handleImageChange} />
              </label>

              {/* Delete */}
              {profile?.profileImage?.url && (
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  className="absolute bottom-0 left-0 w-8 h-8 rounded-full bg-rose-500 hover:bg-rose-600 text-white flex items-center justify-center shadow-md transition-all"
                >
                  <FiTrash2 size={12} />
                </button>
              )}
            </div>

            {/* NAME + ROLE */}
            <h2 className="text-base font-bold text-slate-800 dark:text-yellow-50">{user?.name || "User"}</h2>
            <span className="mt-1 px-3 py-0.5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-semibold uppercase tracking-wider">
              {user?.role || "Team"}
            </span>

            {/* INFO ROWS */}
            <div className="w-full mt-4 space-y-2">
              {INFO_ROWS.map(({ icon: Icon, color, label, key, fromUser }) => (
                <div key={key} className="flex items-center gap-2.5 bg-gray-50 rounded-xl p-2.5 text-left">
                  <div className={`w-7 h-7 rounded-lg ${color} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-400 font-medium">{label}</p>
                    <p className="text-xs text-slate-700 font-semibold truncate">
                      {fromUser ? (user?.email || "—") : (formData[key] || "Not added")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── RIGHT CARD ── */}
          <div className=" border border-gray-200 rounded-2xl p-5 shadow-sm">
            <h2 className="text-sm font-bold text-slate-800 mb-4 dark:text-yellow-50">Edit Information</h2>

            <form onSubmit={handleSubmit} className="space-y-4">

              {/* BIO */}
              <div>
                <label className="block text-xs font-semibold  mb-1.5">Bio</label>
                <textarea
                  rows="3"
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  placeholder="Write something about yourself..."
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all text-sm text-slate-700 resize-none"
                />
              </div>

              {/* PHONE */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 dark:text-yellow-50 mb-1.5">Phone Number</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all">
                  <FiPhone size={13} className="text-blue-400 shrink-0" />
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="Enter your phone number"
                    className="w-full bg-transparent py-2 px-2 text-sm outline-none text-slate-800 dark:text-white"
                  />
                </div>
              </div>

              {/* EMAIL (disabled) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5">Email Address</label>
                <div className="flex items-center gap-2 bg-gray-100 border border-gray-200 rounded-xl px-3">
                  <FiMail size={13} className="text-gray-400 shrink-0" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ""}
                    className="w-full bg-transparent py-2 text-sm text-gray-400 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              {/* SAVE */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold text-sm shadow-sm shadow-blue-200 transition-all active:scale-95"
                >
                  <FiSave size={14} />
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;