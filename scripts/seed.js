const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const Round = require('../models/Round');
const Bet = require('../models/Bet');

async function seedDatabase() {
    try {
        console.log('🌱 Starting database seeding...');
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rocket-betting', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        
        console.log('✅ Connected to MongoDB');
        
        // Clear existing data
        await Promise.all([
            User.deleteMany({}),
            Round.deleteMany({}),
            Bet.deleteMany({})
        ]);
        
        console.log('🗑️ Cleared existing data');
        
        // Seed rounds
        await seedRounds();
        
        // Seed sample users (for development)
        if (process.env.NODE_ENV === 'development') {
            await seedSampleUsers();
        }
        
        console.log('✅ Database seeding completed successfully!');
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

async function seedRounds() {
    const rounds = [
        {
            roundNumber: 1,
            name: "Rocket Distance Gamble",
            description: "Choose which rocket will fly the farthest distance",
            isActive: false,
            isCompleted: false,
            settings: {
                maxBet: 500,
                minBet: 10,
                timeLimit: 300,
                subRounds: 1
            }
        },
        {
            roundNumber: 2,
            name: "Projectile Range Prediction",
            description: "Predict the exact range of the syringe rocket",
            isActive: false,
            isCompleted: false,
            settings: {
                maxBet: 500,
                minBet: 10,
                timeLimit: 300,
                subRounds: 1
            }
        },
        {
            roundNumber: 3,
            name: "Nexus Dog Fights",
            description: "20 rounds of epic dog fight predictions",
            isActive: false,
            isCompleted: false,
            settings: {
                maxBet: 200,
                minBet: 10,
                timeLimit: 600,
                subRounds: 20
            }
        }
    ];
    
    await Round.insertMany(rounds);
    console.log('🎮 Seeded game rounds');
}

async function seedSampleUsers() {
    const sampleUsers = [
        {
            name: 'TestPlayer1',
            ipAddress: '192.168.1.100',
            credits: 1000,
            currentRound: 1,
            isActive: true
        },
        {
            name: 'TestPlayer2',
            ipAddress: '192.168.1.101',
            credits: 1200,
            currentRound: 1,
            isActive: true
        },
        {
            name: 'TestPlayer3',
            ipAddress: '192.168.1.102',
            credits: 800,
            currentRound: 2,
            isActive: true
        },
        {
            name: 'TestChampion',
            ipAddress: '192.168.1.103',
            credits: 2500,
            currentRound: 3,
            isActive: true,
            totalWinnings: 1500
        },
        {
            name: 'InactivePlayer',
            ipAddress: '192.168.1.104',
            credits: 0,
            currentRound: 1,
            isActive: false
        }
    ];
    
    await User.insertMany(sampleUsers);
    console.log('👥 Seeded sample users');
}

// Run seeding
seedDatabase();
