const express = require('express');
const http = require('http');

const app = express();
const cookieParser = require('cookie-parser');

const { Server } = require('socket.io');
const session = require('express-session');
const dotenv = require('dotenv');
const passport = require('passport');
const helmet = require('helmet');
const hpp = require('hpp');
const cors = require('cors');
const passportConfig = require('./passport');

const { sequelize } = require('./models');

const port = process.env.PORT || 8000;

//데이터베이스 연결
sequelize
  .sync({ force: false })
  .then(() => {
    console.log('데이터베이스 연결 성공');
  })
  .catch((err) => {
    console.error(err);
  });

//써드파티 미들웨어 설정
const sessionOption = {
  resave: false,
  saveUninitialized: false,
  secret: process.env.COOKIE_SECRET,
  cookie: {
    httpOnly: true,
    secure: false,
    maxAge: 60 * 60 * 24 * 1000,
  },
  credentials: 'include',
};

app.use(express.urlencoded({ extended: false })); // 데이터타입 multipart/form-data - req.body 사용 가능
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(session(sessionOption));

app.use(express.json());

dotenv.config();
passportConfig();
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV === 'production') {
  //app.enable('trust proxy'); //proxy적용시
  app.use(helmet({ contentSecurityPolicy: false })); //요청응답 관련 보안
  app.use(hpp());
}

//CORS
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? 'https://skku-qr.com'
      : 'http://localhost:3000',
  credentials: true,
};

app.use(cors(corsOptions));

//App
app.get('/', (req, res) => {
  res.send('Hello World!');
});

//라우팅
const authRouter = require('./routes/auth');
const userRouter = require('./routes/user');

app.use('/auth', authRouter);
app.use('/users', userRouter);

//404
app.all('*', (req, res, next) => {
  res.status(404).json({ status: 'fail', message: '404 Not Found' });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === 'production'
        ? 'https://skku-qr.com'
        : 'http://localhost:3000',
    methods: ['GET'],
    credentials: true,
  },
});

const presentationSocket = require('./socket/presentationSocket');

presentationSocket(io);

server.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
