const User = require('../models/userModel')
const factory = require('./handlerFactory')
const AppError = require('../utils/appError')

exports.getUsers = factory.getAll(User)
exports.getUser = factory.getOne(User)
exports.createUser = factory.createOne(User)
exports.updateUser = factory.updateOne(User)
exports.deleteUser = factory.deleteOne(User)

exports.getMe = (req, _, next) => {
  req.params.id = req.user.id
  next()
}

exports.updateMe = async (req, res) => {
  // Create error if user POSTsd password data
  if (req.body.password || req.body.passwordConfirm) {
    throw new AppError('This route is not for password updates. Please use /users/updateMyPassword', 400)
  }

  // Filtered out unwanted fields names that are not allowed to be updated
  const filterBody = filterObj(req.body, 'name', 'email')

  // Update user document
  const user = await User.findByIdAndUpdate(req.user.id, filterBody,
    { new: true, runValidators: true }
  )

  res.send(user)
}

exports.deleteMe = async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, { active: false })
  res.status(204).send()
}

const filterObj = (obj, ...allwedFields) => {
  const newObj = {}
  for (const key in obj) {
    if (allwedFields.includes(key)) {
      newObj[key] = obj[key]
    }
  }
  return newObj
}
