const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db = require('../utils/db');

// Secret JWT (usar variável de ambiente em produção)
const JWT_SECRET = 'your_jwt_secret_key';

// Registro de usuário
router.post(
  '/register',
  [
    body('username').isLength({ min: 3 }).withMessage('Username deve ter ao menos 3 caracteres'),
    body('password').isLength({ min: 6 }).withMessage('Senha deve ter ao menos 6 caracteres'),
    body('fullName').notEmpty().withMessage('Nome completo é obrigatório'),
    body('email').isEmail().withMessage('Email inválido')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password, fullName, email } = req.body;

    try {
      const userExists = await db.getUserByUsername(username);
      if (userExists) {
        return res.status(400).json({ message: 'Usuário já existe' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userId = await db.createUser(username, hashedPassword, fullName, email);

      return res.status(201).json({
        message: "Usuário criado com sucesso",
        user: {
          id: userId,
          username,
          fullName,
          email
        }
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

// Login de usuário
router.post(
  '/login',
  [
    body('username').notEmpty().withMessage('Username é obrigatório'),
    body('password').notEmpty().withMessage('Senha é obrigatória')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, password } = req.body;

    try {
      const user = await db.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ message: 'Usuário ou senha inválidos' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Usuário ou senha inválidos' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

// Excluir usuário
router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const changes = await db.deleteUser(userId);

    if (changes === 0) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (err) {
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

// Atualização de perfil de usuário (todos os campos opcionais)
router.put(
  '/:id',
  body('email').optional().isEmail().withMessage('Email inválido'),
  body('bio').optional().isLength({ max: 100 }).withMessage('Biografia deve ter até 100 caracteres'),
  body('fullName').optional().isString(),
  body('pronouns').optional().isString(),
  body('photo').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = parseInt(req.params.id);
    const { fullName, email, photo, pronouns, bio } = req.body;

    try {
      const updated = await db.updateUserProfile(userId, photo, pronouns, bio, fullName, email);
      if (updated === 0) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }
      res.json({ message: 'Perfil atualizado com sucesso' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Erro no servidor' });
    }
  }
);

router.get('/profile/:username', async (req, res) => {
  const { username } = req.params;
  try {
    const userInfo = await db.getPublicUserInfo(username);
    if (!userInfo) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }
    res.json(userInfo);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro no servidor' });
  }
});

module.exports = router;
