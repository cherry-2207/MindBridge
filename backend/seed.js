require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Import all models
const Organization = require('./models/Organization');
const User = require('./models/User');
const MentorAvailability = require('./models/MentorAvailability');
const ChatSession = require('./models/ChatSession');
const Session = require('./models/Session');
const Assessment = require('./models/Assessment');
const Alert = require('./models/Alert');

const seedData = async () => {
  try {
    console.log('🚀 Starting Database Seeding...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Clear existing data
    console.log('🧹 Cleaning old data...');
    await Promise.all([
      Organization.deleteMany({}),
      User.deleteMany({}),
      MentorAvailability.deleteMany({}),
      ChatSession.deleteMany({}),
      Session.deleteMany({}),
      Assessment.deleteMany({}),
      Alert.deleteMany({}),
    ]);

    // Small delay to ensure indexes are ready
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Create Organization
    console.log('🏢 Creating Organizations...');
    const org = await Organization.create({
      name: 'MindBridge Global NGO',
      type: 'ngo',
      contactEmail: 'contact@mindbridge.org',
      location: 'Bangalore, India',
    });

    // 3. Create Users
    console.log('👤 Creating Users...');
    const timestamp = Date.now();
    
    let user, mentor, ngoAdmin;
    try {
      // Test Youth User
      user = await User.create({
        name: 'Amit Kumar',
        email: `user_${timestamp}@test.com`,
        password: 'password123',
        role: 'user',
        organization: org._id,
        ageGroup: '19-21',
        gender: 'male',
        language: 'hi',
      });

      // Test Mentor
      mentor = await User.create({
        name: 'Dr. Sarah Smith',
        email: `mentor_${timestamp}@test.com`,
        password: 'password123',
        role: 'mentor',
        organization: org._id,
        gender: 'female',
        language: 'en',
      });

      // Test NGO Admin
      ngoAdmin = await User.create({
        name: 'Vikram Singh',
        email: `ngo_${timestamp}@test.com`,
        password: 'password123',
        role: 'ngo',
        organization: org._id,
      });
    } catch (userErr) {
      console.error('❌ User Creation Failed:', userErr.message);
      if (userErr.errors) {
        Object.keys(userErr.errors).forEach(key => {
          console.error(`- Field "${key}": ${userErr.errors[key].message}`);
        });
      }
      throw userErr;
    }

    // 4. Create Mentor Availability
    console.log('📅 Setting Mentor Availability...');
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const availability = await MentorAvailability.create({
      mentor: mentor._id,
      date: nextWeek,
      language: 'en',
      gender: 'female',
      slots: [
        { startTime: '10:00', endTime: '11:00', isBooked: true },
        { startTime: '14:00', endTime: '15:00', isBooked: false }
      ]
    });

    // 5. Create a Sample Chat Session
    console.log('🤖 Creating Sample Chat History...');
    const chat = await ChatSession.create({
      user: user._id,
      status: 'completed',
      messages: [
        { sender: 'user', content: 'Hi, I am feeling very stressed about my board exams.' },
        { sender: 'bot', content: 'I hear you. Exam pressure can be really tough. Tell me more.' },
        { sender: 'user', content: 'I feel like if I fail, my life is over.' }
      ],
      summary: 'User is expressing severe academic pressure and catastrophic thinking about exam failure.'
    });

    // 6. Create ML Assessment
    console.log('🧠 Creating ML Assessments...');
    const assessment = await Assessment.create({
      user: user._id,
      sourceType: 'chat',
      sourceId: chat._id,
      sourceModel: 'ChatSession',
      summary: chat.summary,
      issueCategory: 'academic',
      intensityLevel: 'high',
      alertSent: true
    });

    // 7. Create NGO Alert
    console.log('⚠️ Triggering NGO Alerts...');
    await Alert.create({
      user: user._id,
      assessment: assessment._id,
      type: 'auto_high',
      severity: 'high',
      message: 'CRITICAL: High academic distress detected for Amit Kumar. Immediate intervention recommended.',
      status: 'active'
    });

    // 8. Create a Scheduled Session
    console.log('🤝 Creating a Scheduled Meeting...');
    await Session.create({
      user: user._id,
      mentor: mentor._id,
      availability: availability._id,
      slotIndex: 0,
      scheduledDate: nextWeek,
      startTime: '10:00',
      endTime: '11:00',
      status: 'confirmed',
      meetLink: 'https://meet.google.com/abc-test-xyz'
    });

    console.log('✨ Database Seeded Successfully!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding Failed:', err);
    process.exit(1);
  }
};

seedData();
