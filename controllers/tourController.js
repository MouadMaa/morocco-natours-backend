const multer = require('multer')

const Tour = require('./../models/tourModel')
const factory = require('./../controllers/handlerFactory')
const AppError = require('../utils/appError')
const { cloudinaryStorageTours } = require('../services/cloudinary')

exports.getTours = factory.getAll(Tour)
exports.getTour = factory.getOne(Tour, 'reviews guides')
exports.createTour = factory.createOne(Tour)
exports.updateTour = factory.updateOne(Tour)
exports.deleteTour = factory.deleteOne(Tour)

exports.toursWithReviewsAndGuides = factory.getAll(Tour, 'reviews guides')

const upload = multer({
  storage: cloudinaryStorageTours,
  fileFilter: (_, file, cb) => {
    if (file.mimetype.startsWith('image')) {
      cb(null, true)
    } else (
      cb(new AppError('Not an image! Please upload only images.', 400), false)
    )
  }
})

exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
])

exports.handleTourImages = (req, res, next) => {
  if (req.files.imageCover && req.files.imageCover.length) {
    req.body.imageCover = req.files.imageCover[0].path
  }

  if (req.files.images && req.files.images.length) {
    req.body.images = []
    req.files.images.map(async file => req.body.images.push(file.path))
  }

  next()
}

exports.aliasTopTours = (req, _, next) => {
  req.query.limit = '3'
  req.query.sort = '-ratingsAverage,price'
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty'
  next()
}

exports.getTourStats = async (_, res) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
    // {
    //   $match: { _id: { $ne: 'EASY' } }
    // }
  ])

  res.send(stats)
}

exports.getMonthlyPlan = async (req, res) => {
  const year = +req.params.year
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: { $push: '$name' }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      $limit: 12
    }
  ])

  res.send(plan)
}

exports.getToursWithin = async (req, res) => {
  const { distance, latlng, unit } = req.params
  const [lat, lng] = latlng.split(',')
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1

  if (!lat || !lng) {
    throw new AppError('Please provide latitute and longitude in the format lat,lng', 400)
  }

  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  })

  res.send(tours)
}

exports.getDistances = async (req, res) => {
  const { latlng, unit } = req.params
  const [lat, lng] = latlng.split(',')
  const multiplier = unit === 'mi' ? 0.000621371 : 0.001

  if (!lat || !lng) {
    throw new AppError('Please provide latitute and longitude in the format lat,lng', 400)
  }

  const distances = await Tour.aggregate([
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [+lng, +lat]
        },
        distanceField: 'distance',
        distanceMultiplier: multiplier
      }
    },
    {
      $project: {
        distance: 1,
        name: 1
      }
    }
  ])

  res.send(distances)
}
