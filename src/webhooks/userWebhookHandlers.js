import User from '../models/User.js';

export const userWebHookhandlers = {
    // Handle user creation from Clerk
    onUserCreated: async (userData) => {
        try {
            // Get role from Clerk's publicMetadata if available
            const role = userData.public_metadata?.role === 'educator' ? 'educator' : 'user';
            
            const newUser = new User({
                _id: userData.id,
                name: {
                    firstName: userData.first_name,
                    lastName: userData.last_name || ''
                },
                email: userData.email_addresses[0].email_address,
                imageUrl: userData.image_url,
                role: role,
                enrolledCourses: []
            });
            
            await newUser.save();
            console.log(`User created successfully: ${userData.id} with role: ${role}`);
        } catch (error) {
            console.error('Error creating user:', error.message);
            throw error;
        }
    },

    // Handle user update from Clerk
    onUserUpdated: async (userData) => {
        try {
            // Get role from Clerk's publicMetadata if available
            const role = userData.public_metadata?.role === 'educator' ? 'educator' : 'user';
            
            const updatedUser = await User.findByIdAndUpdate(
                userData.id,
                {
                    name: {
                        firstName: userData.first_name,
                        lastName: userData.last_name || ''
                    },
                    email: userData.email_addresses[0].email_address,
                    imageUrl: userData.image_url,
                    role: role
                },
                { new: true, runValidators: true }
            );
            
            if (!updatedUser) {
                console.log(`User not found: ${userData.id}`);
                return;
            }
            
            console.log(`User updated successfully: ${userData.id} with role: ${role}`);
        } catch (error) {
            console.error('Error updating user:', error.message);
            throw error;
        }
    },

    // Handle user deletion from Clerk
    onUserDeleted: async (userData) => {
        try {
            const deletedUser = await User.findByIdAndDelete(userData.id);
            
            if (!deletedUser) {
                console.log(`User not found: ${userData.id}`);
                return;
            }
            
            console.log(`User deleted successfully: ${userData.id}`);
        } catch (error) {
            console.error('Error deleting user:', error.message);
            throw error;
        }
    }
};

