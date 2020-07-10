const { Router } = require('express')

const reviewController = require('./../controllers/reviewController')
const authController = require('./../controllers/authController')

const router = Router()

router.route('/')
  .get(reviewController.getReviews)
  .post(authController.protect, authController.restrictTo('user'), reviewController.createReview)

router.route('/:id')
  .get(reviewController.getReview)
  .patch(reviewController.updateReview)
  .delete(reviewController.deleteReview)

module.exports = router
