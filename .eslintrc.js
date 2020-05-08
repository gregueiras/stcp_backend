module.exports = {
  parser: '@typescript-eslint/parser', // Specifies the ESLint parser
  extends: ['airbnb-typescript', 'prettier/@typescript-eslint'],
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2020, // Allows for the parsing of modern ECMAScript features
    sourceType: 'module', // Allows for the use of imports
  },
  rules: {
    '@typescript-eslint/ban-ts-ignore': 'off',
  },
}
