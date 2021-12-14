const request = require('supertest')
const app = require('./index');

describe("register account", () => {
// Tests for /register endpoint
    test('Should successfully register account', async () => {
        const response = await request(app).post('/register')
        .send({
            email: "email",
            password: "password",
            firstName: "First",
            lastName: "Last",
            age: 24,
            admin: 0
        })
        expect(response.text).toEqual("\"Register Successful!\"")
        expect(response.statusCode).toBe(200)
    })

    test('Should fail to register account', async () => {
        const response = await request(app).post('/register').send({
            email: "email",
            firstName: "First",
            lastName: "Last",
            age: 24,
            admin: 0
        })
        expect(response.statusCode).toBe(500)
    })
})

describe("login account", () => {
// Tests for /login endpoint
    test('Should successfully login account with good credentials', async () => {
        const response = await request(app).post('/login').send({
            email: "email",
            password: "password"
        })
        expect(response.statusCode).toBe(200)
    })
    
    test('Should fail to login account when email doesnt exist', async () => {
        const response = await request(app).post('/login').send({
            password: "test"
        })
        expect(response.text).toEqual("\"User does not exist!\"")
    })
})

describe("get all books", () => {
// Tests for /getAllBooks endpoint
    test('Should get all books', async () => {
        const response = await request(app).get('/getAllBooks').send({})
        expect(response.statusCode).toBe(200)
    })
})

describe("get books by filter", () => {
    // Tests for /getBooksByFilter endpoint
        test('Should get books by filter', async () => {
            const response = await request(app).post('/getBooksByFilter').send({
                search: "Title",
                filter: "Title"
            })
            expect(response.statusCode).toBe(200)
        })
    })

