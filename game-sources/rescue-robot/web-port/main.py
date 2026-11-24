# /// script
# dependencies = ["pygame-ce"]
# ///
"""Ponto de entrada do Robo Resgate (versão web, empacotada com pygbag).

Execução local (desktop):  python main.py
Execução no navegador:     python -m pygbag .
"""
import asyncio

from src.jogo import main

asyncio.run(main())
