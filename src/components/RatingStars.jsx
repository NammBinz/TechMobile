function RatingStars({ rating = 5, size = 'sm', showNumber = false }) {
  const safeRating = Math.max(0, Math.min(5, Number(rating) || 0))

  return (
    <div className={`rating-stars rating-${size}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          className={star <= safeRating ? 'rating-star active' : 'rating-star'}
        >
          ★
        </span>
      ))}

      {showNumber && (
        <strong className="rating-number">{safeRating}/5</strong>
      )}
    </div>
  )
}

export default RatingStars