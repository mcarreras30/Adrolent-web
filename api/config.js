module.exports = (req, res) => {
  res.status(200).json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    googlePickerApiKey: process.env.GOOGLE_PICKER_API_KEY || null,
  });
};
