# ELI5 Explanation of Your React Native Project Features

Think of your app like a smart online bookstore mall with guards, messengers, and a notebook that remembers things.

This file explains each required feature in very simple words.

## MP1: Product or Service CRUD + Photo Upload or Camera

CRUD means:
- Create: add a new product
- Read: view products
- Update: edit product details
- Delete: archive or remove product

ELI5:
- Admin can add books like putting toys on a shelf.
- Admin can edit the toy label if price or stock changes.
- Admin can hide a toy if it should not be sold now.
- Admin can upload pictures from gallery or camera, and the backend stores image links.

Result: Implemented.

## MP2: User Functions

### Login, Register, Update Profile, Upload or Take Photo

ELI5:
- A user can make an account (register) like getting a library card.
- A user can log in with email and password.
- A user can edit profile details and profile picture.
- The app can use gallery or camera for profile photo.

Result: Implemented.

### Google or Facebook Login

ELI5:
- Google sign-in is working.
- Facebook sign-in is not found in current auth flow.

Result: Partial. Google is done, Facebook is missing.

## MP3: Review and Ratings

Required: only users who really bought and received the item can review, and users can update their own review.

ELI5:
- You can only leave a review if you actually received the book.
- The app checks your delivered order before allowing review.
- If you already reviewed, your next review edits the old one instead of creating a new one.

Result: Implemented.

## MP4: SQLite Cart Persistence

Required: save cart before checkout, load when app opens, clear after checkout.

ELI5:
- Your cart is saved in a local notebook (SQLite) so it does not disappear.
- When app opens, it reads that notebook and restores your cart.
- After successful checkout, cart items are removed from storage.

Result: Implemented.

## Term Test Transaction Features

### Completed transaction

ELI5:
- Checkout sends an order to backend and creates a pending transaction.

### Update status of transaction

ELI5:
- Admin can change order status (for example pending to shipped).
- User can confirm delivered when the package arrives.

### Send push notification after update

ELI5:
- Every important order change sends a push message to the user.

### Click notification to view order details

ELI5:
- If user taps the notification, the app opens the correct order detail screen.

Result: Implemented.

## Quiz 1: Search and Filters

Required: search + price range, and category + price range.

ELI5:
- Search box finds books by name or author.
- Category chips narrow results by genre.
- Price sliders choose minimum and maximum budget.
- All filters can work together at the same time.

Result: Implemented.

## Quiz 2: Promotion Notifications

Required: send promotion push notifications and show details.

ELI5:
- Admin creates a promotion like a sale poster.
- Backend sends push notifications to users.
- Tapping notification opens promotion detail page.

Result: Implemented.

## Quiz 3: Redux for Order, Product, and Review

ELI5:
- Redux is the app memory board.
- Product, order, and review data are managed through Redux actions and reducers.
- This keeps data flow organized and predictable.

Result: Implemented.

## Unit 1: User Interface with Drawer

ELI5:
- Drawer is the side menu like a sliding folder.
- It has main pages and role-based entries (user vs admin).
- Navigation is set up so users can reach profile, shop, cart, admin pages, and more.

Result: Implemented.

## Unit 2: Backend JWT Storage + Push Token Rules

Required: JWT in SQLite or secure store, push token in user model, stale token update or removal.

ELI5:
- When user logs in, app gets a secret pass (JWT).
- Backend stores JWT record in SQLite.
- Frontend stores JWT securely using Secure Store.
- User model saves push tokens (device addresses).
- Old or bad tokens are cleaned up so notifications stay reliable.

Result: Implemented.

## Term Test Lecture: App Complexity and Added Features

ELI5 extra features already present:
- Low stock alerts to admins
- Cancellation request workflow (user asks, admin decides)
- Profanity filter for review comments
- Promotion coupon validation and usage tracking
- Notification inbox screen in app

Result: Implemented with good complexity.

## Final Simple Summary

Your project is strong and covers almost all required features.

Most important note:
- Facebook login is the only visible missing piece from the rubric item that asks Google or Facebook login.
- Everything else in your list is already wired in code with connected frontend and backend flows.
