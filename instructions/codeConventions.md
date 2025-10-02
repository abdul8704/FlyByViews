# Project Coding Instructions for LLM IDE

These are the coding guidelines and best practices to follow while generating or editing code in this project.

---

## 1️⃣ File Naming Conventions

- Use the format `<name>.<layer>.js` for all source files.
  - Examples:
    - `users.model.js`
    - `auth.router.js`
    - `customError.js`

- Validation files should be in the `src/validators/` folder.
  - Name them according to the controller they validate: `<controllerName>.validate.js`
  - Example: For `user.controller.js`, create `user.controller.validate.js`.

---

## 2️⃣ Directory Structure

```
src/
  models/                # Mongoose schemas and model index aggregation
  controllers/
  routes/
  middlewares/
  server.middleware.js   # Validation and authentication
  service/
  utils/                 # Shared helpers (customError, response, hashing, logger, nodemailerHelper, tokenGenerator, ejsTemplate)
  configs/               # App and DB configuration files
  constants/             # Centralized enums and status codes
  validators/            # All validation functions
```

---

## 3️⃣ Variable Naming

- Use camelCase for all variables and functions.
  - Examples: `userController`, `addFileService`, `uploadFileValidator`.

---

## 4️⃣ Function Syntax

- Prefer arrow functions for all functions.
- Always put the export statement at the end of the file.

```js
const addUserService = async (userData) => {
  // function logic
}

const deleteUserService = async (userId) => {
  // function logic
}

module.exports = { addUserService, deleteUserService }
```

---

## 5️⃣ API Endpoint Naming

- Use snake_case for route paths.
  - Examples:

```js
router.post('/upload_file', uploadFileController)
router.get('/get_user_details', getUserController)
```

---

## 6️⃣ Validation Guidelines

- All validations should reside in `src/validators/`.
- Each controller should have its own validator file: `<controllerName>.validate.js`.
- Example for `userController.js`:

```js
// src/validators/userController.validate.js
const { ApiError } = require('../utils/customError')

const validateAddUser = (data) => {
  if (!data.email) {
    throw new ApiError('Email is required', 400)
  }
  if (!data.password) {
    throw new ApiError('Password is required', 400)
  }
  return true
}

module.exports = { validateAddUser }
```

---

## 7️⃣ Error Handling

- Always use the custom `ApiError` object from `utils/customError` for throwing errors.
- Example:

```js
const { ApiError } = require('../utils/customError')

const someFunction = () => {
  if (!someCondition) {
    throw new ApiError('Something went wrong', 400)
  }
}
```

---

## 8️⃣ Example Controller with Validation

```js
// src/controllers/userController.js
const { validateAddUser } = require('../validators/userController.validate')
const { addUserService } = require('../service/userService.js')
const { ApiError } = require('../utils/customError')

const addUserController = async (req, res, next) => {
  try {
    validateAddUser(req.body)
    const result = await addUserService(req.body)
    res.status(201).json({ success: true, data: result })
  } catch (error) {
    next(error)
  }
}

module.exports = { addUserController }
```

---

## ✅ Summary

- CamelCase variables/functions
- Arrow functions
- Export at the end (`module.exports = { ... }`)
- Validation in `src/validators/<controller>.validate.js`
- File naming: `<name>.<layer>.js`
- API endpoints in snake_case
- Errors via custom `ApiError` object

---


```
