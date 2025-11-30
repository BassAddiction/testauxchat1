-- Add is_admin field to users table
ALTER TABLE t_p53416936_auxchat_energy_messa.users ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;