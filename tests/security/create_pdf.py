from reportlab.pdfgen import canvas

c = canvas.Canvas("constitution.pdf")
c.drawString(100, 750, "Article 3: The judicial power of the United States shall be vested in one supreme Court.")
c.drawString(100, 730, "Article 7: The ratification of the conventions of nine states, shall be sufficient for the establishment of this Constitution.")
c.save()
