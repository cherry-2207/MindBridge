const MentorAvailability = require('../models/MentorAvailability');
const User = require('../models/User');

// ─────────────────────────────────────────────
// @desc    Get available mentors filtered by date, language, gender
// @route   GET /api/mentors?date=YYYY-MM-DD&language=en&gender=female
// @access  Private (users)
// ─────────────────────────────────────────────
exports.getAvailableMentors = async (req, res) => {
  try {
    const { date, language, gender } = req.query;

    if (!date) {
      return res.status(400).json({ success: false, message: 'Please provide a date query parameter.' });
    }

    // Build the date range for the calendar day (start and end of day)
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Filter: only show availability blocks that have at least one un-booked slot
    const query = {
      date: { $gte: startOfDay, $lte: endOfDay },
      'slots.isBooked': false,
    };

    // Optionally filter by language or gender
    if (language) query.language = language;
    if (gender && gender !== 'no_preference') query.gender = gender;

    const availabilities = await MentorAvailability.find(query).populate(
      'mentor',
      'name gender language organization'
    );

    res.json({
      success: true,
      count: availabilities.length,
      data: availabilities,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @desc    Mentor sets/updates their available slots for a given day
// @route   POST /api/mentors/availability
// @access  Private (mentors only)
// ─────────────────────────────────────────────
exports.setAvailability = async (req, res) => {
  try {
    const { date, slots } = req.body;

    if (!date || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide date and at least one time slot.',
      });
    }

    // Upsert: create or overwrite the availability for this mentor on this date
    const availability = await MentorAvailability.findOneAndUpdate(
      { mentor: req.user._id, date: new Date(date) },
      {
        mentor: req.user._id,
        date: new Date(date),
        slots,
        language: req.user.language,
        gender: req.user.gender,
      },
      { upsert: true, new: true }
    );

    res.status(201).json({ success: true, data: availability });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @desc    Get the logged-in mentor's own availability schedule
// @route   GET /api/mentors/availability/me
// @access  Private (mentors only)
// ─────────────────────────────────────────────
exports.getMyAvailability = async (req, res) => {
  try {
    const availability = await MentorAvailability.find({
      mentor: req.user._id,
      date: { $gte: new Date() }, // Only show future availability
    }).sort('date');

    res.json({ success: true, data: availability });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────
// @desc    Delete a specific availability block
// @route   DELETE /api/mentors/availability/:id
// @access  Private (mentors only)
// ─────────────────────────────────────────────
exports.deleteAvailability = async (req, res) => {
  try {
    const availability = await MentorAvailability.findOneAndDelete({
      _id: req.params.id,
      mentor: req.user._id, // Ensure mentor can only delete their own
    });

    if (!availability) {
      return res.status(404).json({ success: false, message: 'Availability not found.' });
    }

    res.json({ success: true, message: 'Availability slot removed.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
