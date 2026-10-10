import { supabase } from "../config/supabaseClient";
import type { Profile } from "../types";

export const getProfile = async (userId: string): Promise<Profile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, store_id')
    .eq('id', userId)
    .single();

  if (error) {
    console.error("Error fetching profile:", error);
    return null;
  }
  return data;
};

export const getAllProfilesForAdmin = async (): Promise<Profile[]> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, store_id')
    .order('full_name', { ascending: true });

  if (error) {
    console.error("Error fetching all profiles for admin:", error);
    throw new Error(error.message);
  }
  return data || [];
};

export interface CreateUserData {
  email: string;
  password: string;
  full_name: string;
  role: 'admin' | 'vendedor';
  store_id?: string | null;
}

export interface UpdateProfileData {
  full_name?: string;
  role?: 'admin' | 'vendedor';
  store_id?: string | null;
}

export const createNewUser = async (userData: CreateUserData): Promise<Profile> => {
  if (!userData.password) {
    throw new Error("Password is required for new user creation.");
  }
  if (!userData.email || !userData.full_name || !userData.role) {
    throw new Error("Missing required fields (email, full_name, role) for new user creation.");
  }

  const { data, error } = await supabase.functions.invoke('create-user', {
    body: {
      email: userData.email,
      password: userData.password,
      full_name: userData.full_name,
      role: userData.role,
      store_id: userData.store_id,
    },
  });

  if (error) {
    console.error("Error calling Edge Function to create user:", error);
    throw new Error(error.message);
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data.user;
};

export const updateProfile = async (userId: string, profileData: UpdateProfileData): Promise<Profile> => {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', userId)
    .select('id, email, full_name, role, store_id')
    .single();

  if (error) {
    console.error("Error updating profile:", error);
    throw new Error(error.message);
  }
  return data;
};

export const deleteUserById = async (userId: string): Promise<void> => {
  const { error } = await supabase.functions.invoke('delete-user', {
    body: { user_id: userId },
  });

  if (error) {
    console.error("Error deleting user:", error);
    throw new Error(error.message);
  }
};