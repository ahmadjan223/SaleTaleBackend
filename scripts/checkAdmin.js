require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');

async function checkAdmin() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const admin = await Admin.findOne();
        if (admin) {
            console.log('Existing admin found:');
            console.log('Email:', admin.email);
            console.log('Phone:', admin.phone);
            console.log('Created at:', admin.createdAt);
        } else {
            console.log('No admin found in the database');
        }
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

checkAdmin(); 