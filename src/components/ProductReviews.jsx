import { useEffect, useState } from 'react'
import api from '../services/api'
import RatingStars from './RatingStars'

function ProductReviews({ productId }) {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    getReviews()
  }, [productId])

  const getReviews = async () => {
    try {
      const res = await api.get('/reviews')

      const productReviews = res.data.filter((review) => {
        return review.productId === productId
      })

      setReviews(productReviews.reverse())
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <section className="product-review-section">
      <h2>Đánh giá sản phẩm</h2>

      {reviews.length === 0 ? (
        <p className="text-muted">
          Sản phẩm chưa có đánh giá nào.
        </p>
      ) : (
        <div className="review-list">
          {reviews.map((review) => (
            <div className="review-item" key={review.id}>
              <div className="review-header">
                <strong>{review.userName}</strong>
                <span>{review.createdAt}</span>
              </div>

              <RatingStars rating={review.rating} size="sm" />

              <p>{review.comment}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

export default ProductReviews