const mongoose = require('mongoose');
const Admin = require('./models/Admin');

// Connect to MongoDB (adjust the connection string as needed)
mongoose.connect('mongodb://localhost:27017/salesapp', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function testPasswordHashing() {
    try {
        console.log('🔍 Testing Password Hashing...\n');

        // Find an existing admin
        const admin = await Admin.findOne();
        if (!admin) {
            console.log('❌ No admin found. Please create an admin first.');
            return;
        }

        console.log('📋 Current Admin Info:');
        console.log(`Email: ${admin.email}`);
        console.log(`Current Password Hash: ${admin.password.substring(0, 20)}...`);
        console.log('');

        // Test password update
        const newPassword = 'newTestPassword123';
        console.log(`🔄 Updating password to: ${newPassword}`);
        
        // Update the password (this should trigger hashing)
        admin.password = newPassword;
        await admin.save();

        console.log(`✅ New Password Hash: ${admin.password.substring(0, 20)}...`);
        console.log('');

        // Test password verification
        console.log('🔐 Testing Password Verification:');
        
        const isCorrectPassword = await admin.comparePassword(newPassword);
        console.log(`✅ Correct password verification: ${isCorrectPassword}`);
        
        const isWrongPassword = await admin.comparePassword('wrongPassword');
        console.log(`❌ Wrong password verification: ${isWrongPassword}`);
        
        console.log('\n🎉 Password hashing test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during password hashing test:', error);
    } finally {
        mongoose.connection.close();
    }
}

testPasswordHashing(); 