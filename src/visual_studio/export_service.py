import re
import fitz  # PyMuPDF
from typing import Tuple, Dict, Any
from src.visual_studio.schemas import DiagramSpec, NodeSpec


def _parse_color(color_str: str, default: Tuple[float, float, float], bg: Tuple[float, float, float] = (1.0, 1.0, 1.0)) -> Tuple[float, float, float]:
    if not color_str or not isinstance(color_str, str):
        return default
    s = color_str.strip().lower()

    # Parse rgba or rgb with alpha blending over background
    m_rgba = re.match(r'rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d\.]+))?\s*\)', s)
    if m_rgba:
        try:
            r = int(m_rgba.group(1)) / 255.0
            g = int(m_rgba.group(2)) / 255.0
            b = int(m_rgba.group(3)) / 255.0
            a = float(m_rgba.group(4)) if m_rgba.group(4) is not None else 1.0
            r_b = r * a + bg[0] * (1.0 - a)
            g_b = g * a + bg[1] * (1.0 - a)
            b_b = b * a + bg[2] * (1.0 - a)
            return (max(0.0, min(1.0, r_b)), max(0.0, min(1.0, g_b)), max(0.0, min(1.0, b_b)))
        except Exception:
            return default

    clean = s.lstrip("#")
    if len(clean) == 3:
        clean = "".join([c * 2 for c in clean])
    if len(clean) == 6:
        try:
            r = int(clean[0:2], 16) / 255.0
            g = int(clean[2:4], 16) / 255.0
            b = int(clean[4:6], 16) / 255.0
            return (r, g, b)
        except ValueError:
            return default
    return default


_parse_hex_color = _parse_color


class ExportService:
    def __init__(self):
        pass

    def export_diagram(
        self,
        diagram: DiagramSpec,
        export_format: str = "png",
        theme: str = "dark",
        width: int = 1200,
        height: int = 800,
    ) -> Tuple[bytes, str]:
        """
        Renders a DiagramSpec locally using PyMuPDF vector drawing primitives.
        Returns: (file_bytes, mime_type)
        """
        doc = fitz.open()
        page = doc.new_page(width=width, height=height)

        d_theme = (getattr(diagram, "theme", None) or "").lower()
        is_dark = theme.lower() == "dark" or d_theme in ["cyberpunk", "bbot-dark", "dark", "emerald", "gradient"]

        if d_theme in ["cyberpunk", "gradient"]:
            bg_color = (0.024, 0.031, 0.078)  # #060814
            card_bg = (0.05, 0.07, 0.15)
        elif d_theme == "emerald":
            bg_color = (0.027, 0.075, 0.055)  # #07130e
            card_bg = (0.04, 0.11, 0.08)
        elif is_dark:
            bg_color = (0.04, 0.06, 0.09)
            card_bg = (0.08, 0.11, 0.17)
        else:
            bg_color = (0.97, 0.98, 0.99)
            card_bg = (1.0, 1.0, 1.0)

        card_border = (0.18, 0.24, 0.35) if is_dark else (0.85, 0.88, 0.92)
        text_primary = (0.96, 0.97, 0.98) if is_dark else (0.08, 0.11, 0.18)
        text_muted = (0.60, 0.65, 0.73) if is_dark else (0.40, 0.45, 0.52)
        accent_amber = (0.78, 0.46, 0.08)  # bbot warm amber #C87514

        # 1. Fill Canvas Background
        page.draw_rect(fitz.Rect(0, 0, width, height), color=None, fill=bg_color)

        # 2. Header Bar
        page.draw_rect(fitz.Rect(0, 0, width, 60), color=None, fill=card_bg)
        page.draw_line(fitz.Point(0, 60), fitz.Point(width, 60), color=card_border, width=1)

        # Header Title
        safe_title = (diagram.title or "Diagram").upper()
        safe_type = (diagram.diagramType or "flow").replace("_", " ").upper()
        title_text = f"TRPW BBOT STUDIO  |  {safe_title} ({safe_type})"
        page.insert_text(fitz.Point(30, 36), title_text, fontsize=12, fontname="helv", color=accent_amber)

        # Subtitle / Summary
        summary_text = (diagram.summary or "")[:140]
        page.insert_text(fitz.Point(30, 52), summary_text, fontsize=8, fontname="helv", color=text_muted)

        # 3. Layout and Draw Nodes
        node_coords = self._calculate_node_layout(diagram, width, height)

        # Draw Directed Edges
        is_canvas = diagram.viewMode == "canvas" or any(n.x is not None and n.y is not None for n in diagram.nodes)
        flow_layouts = {"process_flow", "decision_flow", "sequence", "timeline", "circular_loop"}
        if is_canvas or diagram.diagramType in flow_layouts:
            edge_color = (0.024, 0.714, 0.831) if is_dark else (0.03, 0.60, 0.75)
            for edge in diagram.edges:
                src = node_coords.get(edge.source)
                tgt = node_coords.get(edge.target)
                if src and tgt:
                    e_color = edge_color
                    if edge.customStyle and edge.customStyle.get("color"):
                        e_color = _parse_color(edge.customStyle.get("color"), edge_color, bg_color)

                    if is_canvas:
                        # Direct connector in 2D space
                        if abs(src["cx"] - tgt["cx"]) < 50:
                            # Vertical step
                            p1 = fitz.Point(src["cx"], src["y"] + src["h"])
                            p2 = fitz.Point(tgt["cx"], tgt["y"])
                        elif tgt["x"] < src["x"] - 30:
                            # Backward/return loop
                            p_exit = fitz.Point(src["x"], src["cy"])
                            p_turn1 = fitz.Point(src["x"] - 20, src["cy"])
                            mid_y = (src["cy"] + tgt["cy"]) / 2
                            p_turn2 = fitz.Point(src["x"] - 20, mid_y)
                            p_turn3 = fitz.Point(tgt["x"] + tgt["w"] + 20, mid_y)
                            p_enter = fitz.Point(tgt["x"] + tgt["w"], tgt["cy"])
                            page.draw_line(p_exit, p_turn1, color=e_color, width=1.5)
                            page.draw_line(p_turn1, p_turn2, color=e_color, width=1.5)
                            page.draw_line(p_turn2, p_turn3, color=e_color, width=1.5)
                            page.draw_line(p_turn3, p_enter, color=e_color, width=1.5)
                            self._draw_arrow_head(page, p_turn3, p_enter, e_color)
                            continue
                        else:
                            # Forward horizontal
                            p1 = fitz.Point(src["x"] + src["w"], src["cy"])
                            p2 = fitz.Point(tgt["x"], tgt["cy"])
                        page.draw_line(p1, p2, color=e_color, width=1.5)
                        self._draw_arrow_head(page, p1, p2, e_color)
                    elif tgt["x"] < src["x"] - 50:
                        # Clean orthogonal step routing: drop down on right, go left, enter target from left
                        p_exit = fitz.Point(src["x"] + src["w"], src["cy"])
                        p_turn1 = fitz.Point(src["x"] + src["w"] + 15, src["cy"])
                        mid_y = (src["cy"] + tgt["cy"]) / 2
                        p_turn2 = fitz.Point(src["x"] + src["w"] + 15, mid_y)
                        p_turn3 = fitz.Point(tgt["x"] - 15, mid_y)
                        p_enter = fitz.Point(tgt["x"], tgt["cy"])
                        page.draw_line(p_exit, p_turn1, color=e_color, width=1.5)
                        page.draw_line(p_turn1, p_turn2, color=e_color, width=1.5)
                        page.draw_line(p_turn2, p_turn3, color=e_color, width=1.5)
                        page.draw_line(p_turn3, p_enter, color=e_color, width=1.5)
                        self._draw_arrow_head(page, p_turn3, p_enter, e_color)
                    else:
                        # Direct horizontal connector from right edge to left edge
                        p1 = fitz.Point(src["x"] + src["w"], src["cy"])
                        p2 = fitz.Point(tgt["x"], tgt["cy"])
                        page.draw_line(p1, p2, color=e_color, width=1.5)
                        self._draw_arrow_head(page, p1, p2, e_color)
        elif diagram.diagramType == "mindmap":
            # For mindmap, radiate from center node to branches
            if diagram.nodes:
                center_id = diagram.nodes[0].id
                src = node_coords.get(center_id)
                edge_color = (0.78, 0.52, 0.15) if is_dark else (0.70, 0.42, 0.08)
                if src:
                    for node in diagram.nodes[1:]:
                        tgt = node_coords.get(node.id)
                        if tgt:
                            p1 = fitz.Point(src["cx"], src["cy"])
                            p2 = fitz.Point(tgt["cx"], tgt["cy"])
                            page.draw_line(p1, p2, color=edge_color, width=1.5)

        # Draw Node Cards
        for node in diagram.nodes:
            pos = node_coords.get(node.id)
            if not pos:
                continue

            rect = fitz.Rect(pos["x"], pos["y"], pos["x"] + pos["w"], pos["y"] + pos["h"])

            # Custom styling from node
            c_style = node.customStyle or {}
            node_shape = str(c_style.get("shape", "card")).lower()
            node_bg = _parse_color(c_style.get("bgColor"), card_bg, bg_color)
            node_border = _parse_color(c_style.get("borderColor"), card_border, bg_color)
            node_text = _parse_color(c_style.get("textColor"), text_primary, bg_color)

            if node_shape == "diamond":
                top_pt = fitz.Point(pos["cx"], pos["y"])
                right_pt = fitz.Point(pos["x"] + pos["w"], pos["cy"])
                bot_pt = fitz.Point(pos["cx"], pos["y"] + pos["h"])
                left_pt = fitz.Point(pos["x"], pos["cy"])
                page.draw_polyline([top_pt, right_pt, bot_pt, left_pt, top_pt], color=node_border, fill=node_bg, width=2, closePath=True)
            elif node_shape == "pill":
                page.draw_rect(rect, color=node_border, fill=node_bg, width=2, radius=0.5)
            elif node_shape in ["rectangle", "cuboid"]:
                page.draw_rect(rect, color=node_border, fill=node_bg, width=2, radius=0.04)
            else:
                page.draw_rect(rect, color=node_border, fill=node_bg, width=1.5, radius=0.08)

            # Node Type Badge
            if node_shape not in ["diamond", "pill"] and pos["h"] >= 75:
                badge_rect = fitz.Rect(pos["x"] + 10, pos["y"] + 8, pos["x"] + 80, pos["y"] + 22)
                page.draw_rect(badge_rect, color=None, fill=node_border, radius=0.15)
                node_type_label = (node.type or "node").upper()[:10]
                page.insert_text(fitz.Point(pos["x"] + 15, pos["y"] + 18), node_type_label, fontsize=7, fontname="helv", color=(1, 1, 1))

                # Step / Metric Badge on Top Right
                if node.badge:
                    badge_str = str(node.badge)[:10]
                    badge_w = max(34, len(badge_str) * 6 + 10)
                    step_box = fitz.Rect(pos["x"] + pos["w"] - badge_w - 10, pos["y"] + 8, pos["x"] + pos["w"] - 10, pos["y"] + 22)
                    page.draw_rect(step_box, color=node_border, fill=node_bg, width=1, radius=0.15)
                    page.insert_text(fitz.Point(pos["x"] + pos["w"] - badge_w - 5, pos["y"] + 18), badge_str, fontsize=7, fontname="helv", color=node_border)

            # Node Label
            label_text = node.label or ""
            if node_shape == "diamond":
                label_rect = fitz.Rect(pos["x"] + pos["w"] * 0.15, pos["cy"] - 14, pos["x"] + pos["w"] * 0.85, pos["cy"] + 20)
                page.insert_textbox(label_rect, label_text, fontsize=9, fontname="helv", color=node_text, align=fitz.TEXT_ALIGN_CENTER)
            elif pos["h"] < 75 or node_shape == "pill":
                # Pill / compact card
                if node.sublabel:
                    label_rect = fitz.Rect(pos["x"] + 12, pos["y"] + 6, pos["x"] + pos["w"] - 12, pos["y"] + pos["h"] * 0.52)
                    sub_rect = fitz.Rect(pos["x"] + 12, pos["y"] + pos["h"] * 0.52, pos["x"] + pos["w"] - 12, pos["y"] + pos["h"] - 4)
                    page.insert_textbox(label_rect, label_text, fontsize=9, fontname="helv", color=node_text, align=fitz.TEXT_ALIGN_CENTER)
                    page.insert_textbox(sub_rect, str(node.sublabel), fontsize=7, fontname="helv", color=text_muted, align=fitz.TEXT_ALIGN_CENTER)
                else:
                    label_rect = fitz.Rect(pos["x"] + 12, pos["y"] + 8, pos["x"] + pos["w"] - 12, pos["y"] + pos["h"] - 8)
                    page.insert_textbox(label_rect, label_text, fontsize=10, fontname="helv", color=node_text, align=fitz.TEXT_ALIGN_CENTER)
            else:
                label_rect = fitz.Rect(pos["x"] + 10, pos["y"] + 28, pos["x"] + pos["w"] - 10, pos["y"] + 55)
                page.insert_textbox(label_rect, label_text, fontsize=10, fontname="helv", color=node_text, align=fitz.TEXT_ALIGN_LEFT)

                # Node Sublabel
                if node.sublabel and (pos["y"] + pos["h"] - 8 > pos["y"] + 56):
                    sub_rect = fitz.Rect(pos["x"] + 10, pos["y"] + 56, pos["x"] + pos["w"] - 10, pos["y"] + pos["h"] - 8)
                    page.insert_textbox(sub_rect, str(node.sublabel), fontsize=8, fontname="helv", color=text_muted, align=fitz.TEXT_ALIGN_LEFT)

        # 4. If Chart Data, render data summary table at bottom
        if diagram.chartData and diagram.chartData.rows:
            self._render_chart_table(page, diagram.chartData, width, height, card_bg, card_border, text_primary, text_muted)

        # 5. Format Output
        if export_format.lower() == "pdf":
            pdf_bytes = doc.tobytes()
            doc.close()
            return pdf_bytes, "application/pdf"
        elif export_format.lower() == "png":
            pix = page.get_pixmap(dpi=150)
            png_bytes = pix.tobytes("png")
            doc.close()
            return png_bytes, "image/png"
        else:
            svg_text = page.get_svg_image()
            doc.close()
            return svg_text.encode("utf-8"), "image/svg+xml"

    def _calculate_node_layout(self, diagram: DiagramSpec, canvas_w: int, canvas_h: int) -> Dict[str, Dict[str, float]]:
        """Calculates 2D positions for nodes based on diagram type."""
        coords = {}
        nodes = diagram.nodes
        n_count = len(nodes)
        if n_count == 0:
            return coords

        card_w = 200
        card_h = 95
        usable_top = 90
        usable_h = canvas_h - usable_top - 60

        # Canvas Mode or custom placed nodes:
        has_custom_coords = any(n.x is not None and n.y is not None for n in nodes)
        if diagram.viewMode == "canvas" or has_custom_coords:
            min_x = min((n.x if n.x is not None else 100) for n in nodes)
            min_y = min((n.y if n.y is not None else 160) for n in nodes)
            max_x = max(((n.x if n.x is not None else 100) + (n.width or 230)) for n in nodes)
            max_y = max(((n.y if n.y is not None else 160) + (n.height or 110)) for n in nodes)
            content_w = max(max_x - min_x, 100)
            content_h = max(max_y - min_y, 100)
            usable_w = canvas_w - 80
            scale = min(usable_w / content_w, usable_h / content_h, 1.0)
            offset_x = 40 + (usable_w - content_w * scale) / 2
            offset_y = usable_top + 15 + (usable_h - content_h * scale) / 2

            for node in nodes:
                nx_orig = node.x if node.x is not None else 100
                ny_orig = node.y if node.y is not None else 160
                nw_orig = node.width or (210 if node.customStyle and node.customStyle.get("shape") == "pill" else 230)
                nh_orig = node.height or (56 if node.customStyle and node.customStyle.get("shape") == "pill" else 110)
                x = offset_x + (nx_orig - min_x) * scale
                y = offset_y + (ny_orig - min_y) * scale
                w = nw_orig * scale
                h = nh_orig * scale
                coords[node.id] = {
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "cx": x + w / 2,
                    "cy": y + h / 2,
                }
            return coords

        # Funnel Layout: Tapered centered descending stages
        if diagram.diagramType == "funnel":
            step_spacing = min(usable_h / max(n_count, 1), 110)
            for idx, node in enumerate(nodes):
                w = max(card_w * (1.1 - idx * 0.08), 160)
                x = (canvas_w - w) / 2
                y = usable_top + idx * step_spacing + 15
                coords[node.id] = {
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": card_h,
                    "cx": x + w / 2,
                    "cy": y + card_h / 2,
                }
            return coords

        # Quadrant Layout: 2x2 Strategic Matrix (NO edges)
        if diagram.diagramType == "quadrant" and n_count <= 4:
            mid_x = canvas_w / 2
            mid_y = usable_top + usable_h / 2
            quad_positions = [
                (mid_x - card_w - 40, mid_y - card_h - 20),  # Top-left (Strategic Bets)
                (mid_x + 40, mid_y - card_h - 20),           # Top-right (Quick Wins)
                (mid_x - card_w - 40, mid_y + 20),           # Bottom-left (Re-evaluate)
                (mid_x + 40, mid_y + 20),                    # Bottom-right (Fill-ins)
            ]
            for idx, node in enumerate(nodes):
                qx, qy = quad_positions[idx % 4]
                coords[node.id] = {
                    "x": qx,
                    "y": qy,
                    "w": card_w,
                    "h": card_h,
                    "cx": qx + card_w / 2,
                    "cy": qy + card_h / 2,
                }
            return coords

        # Bento Grid: Hero tile spanning 2 columns + clean modular tiles (NO edges)
        if diagram.diagramType == "bento_grid":
            cols = 3
            spacing_x = (canvas_w - 80) / cols
            row_h = 120
            hero_w = spacing_x * 2 - 20
            single_w = spacing_x - 20

            for idx, node in enumerate(nodes):
                if idx == 0:
                    # Top hero module (spans 2 columns)
                    x = 40
                    y = usable_top + 15
                    w = hero_w
                    h = row_h
                elif idx == 1:
                    # First row single module
                    x = 40 + spacing_x * 2
                    y = usable_top + 15
                    w = single_w
                    h = row_h
                else:
                    # Subsequent rows: 3 neat columns
                    sub_idx = idx - 2
                    r = 1 + (sub_idx // cols)
                    c = sub_idx % cols
                    x = 40 + c * spacing_x
                    y = usable_top + 15 + r * (row_h + 15)
                    w = single_w
                    h = row_h

                coords[node.id] = {
                    "x": x,
                    "y": y,
                    "w": w,
                    "h": h,
                    "cx": x + w / 2,
                    "cy": y + h / 2,
                }
            return coords

        # Comparison Layout: Side-by-side vertical matrix columns
        if diagram.diagramType == "comparison":
            cols = min(n_count, 3)
            col_w = min((canvas_w - 100) / max(cols, 1), 320)
            col_h = min(usable_h - 40, 260)
            start_x = (canvas_w - (cols * col_w + (cols - 1) * 30)) / 2
            for idx, node in enumerate(nodes[:cols]):
                x = start_x + idx * (col_w + 30)
                y = usable_top + 30
                coords[node.id] = {
                    "x": x,
                    "y": y,
                    "w": col_w,
                    "h": col_h,
                    "cx": x + col_w / 2,
                    "cy": y + col_h / 2,
                }
            return coords

        # Mindmap Layout: Radiating from center
        if diagram.diagramType == "mindmap" and n_count > 1:
            mid_x = canvas_w / 2
            mid_y = usable_top + usable_h / 2
            # Center node
            center_node = nodes[0]
            coords[center_node.id] = {
                "x": mid_x - card_w / 2,
                "y": mid_y - card_h / 2,
                "w": card_w,
                "h": card_h,
                "cx": mid_x,
                "cy": mid_y,
            }
            branches = nodes[1:]
            left_branches = [b for i, b in enumerate(branches) if i % 2 == 0]
            right_branches = [b for i, b in enumerate(branches) if i % 2 == 1]
            left_step = usable_h / max(len(left_branches) + 1, 2)
            for i, b in enumerate(left_branches):
                bx = mid_x - card_w - 120
                by = usable_top + (i + 1) * left_step - card_h / 2
                coords[b.id] = {"x": bx, "y": by, "w": card_w, "h": card_h, "cx": bx + card_w, "cy": by + card_h / 2}

            right_step = usable_h / max(len(right_branches) + 1, 2)
            for i, b in enumerate(right_branches):
                bx = mid_x + 120
                by = usable_top + (i + 1) * right_step - card_h / 2
                coords[b.id] = {"x": bx, "y": by, "w": card_w, "h": card_h, "cx": bx, "cy": by + card_h / 2}
            return coords

        # Timeline or Process: Horizontal sequential flow
        if diagram.diagramType in ["process_flow", "timeline", "sequence"] or n_count <= 5:
            cols = min(n_count, 4)
            rows = (n_count + cols - 1) // cols
            spacing_x = (canvas_w - 80) / max(cols, 1)
            spacing_y = usable_h / max(rows, 1)

            for idx, node in enumerate(nodes):
                r = idx // cols
                c = idx % cols
                x = 40 + c * spacing_x + (spacing_x - card_w) / 2
                y = usable_top + r * spacing_y + 20
                coords[node.id] = {
                    "x": max(20, min(canvas_w - card_w - 20, x)),
                    "y": y,
                    "w": card_w,
                    "h": card_h,
                    "cx": x + card_w / 2,
                    "cy": y + card_h / 2,
                }
        else:
            # Multi-column grid for larger generic charts
            cols = 3
            spacing_x = (canvas_w - 80) / cols
            spacing_y = 130
            for idx, node in enumerate(nodes):
                r = idx // cols
                c = idx % cols
                x = 40 + c * spacing_x + (spacing_x - card_w) / 2
                y = usable_top + r * spacing_y + 15
                coords[node.id] = {
                    "x": max(20, min(canvas_w - card_w - 20, x)),
                    "y": y,
                    "w": card_w,
                    "h": card_h,
                    "cx": x + card_w / 2,
                    "cy": y + card_h / 2,
                }

        return coords

    def _draw_arrow_head(self, page, p1: fitz.Point, p2: fitz.Point, color):
        import math
        dx = p2.x - p1.x
        dy = p2.y - p1.y
        dist = math.hypot(dx, dy)
        if dist < 10:
            return
        ux = dx / dist
        uy = dy / dist
        arrow_len = 8
        arrow_w = 4
        # Arrow points
        left = fitz.Point(p2.x - arrow_len * ux + arrow_w * uy, p2.y - arrow_len * uy - arrow_w * ux)
        right = fitz.Point(p2.x - arrow_len * ux - arrow_w * uy, p2.y - arrow_len * uy + arrow_w * ux)
        page.draw_line(p2, left, color=color, width=2)
        page.draw_line(p2, right, color=color, width=2)

    def _render_chart_table(self, page, chart_data, canvas_w, canvas_h, bg, border, text_color, muted):
        table_top = canvas_h - 160
        table_rect = fitz.Rect(40, table_top, canvas_w - 40, canvas_h - 20)
        page.draw_rect(table_rect, color=border, fill=bg, radius=0.04)
        page.insert_text(fitz.Point(55, table_top + 22), "DATA MATRIX SUMMARY", fontsize=8, fontname="helv", color=muted)

        rows = chart_data.rows[:5]
        col_w = (canvas_w - 120) / max(len(rows), 1)
        for i, row in enumerate(rows):
            cat_val = str(row.get(chart_data.xAxisKey, f"Item {i+1}"))
            metric_val = next((str(v) for k, v in row.items() if k != chart_data.xAxisKey), "")
            x = 55 + i * col_w
            page.insert_text(fitz.Point(x, table_top + 50), cat_val[:20], fontsize=9, fontname="helv", color=text_color)
            page.insert_text(fitz.Point(x, table_top + 70), f"{metric_val} {chart_data.unit or ''}", fontsize=8, fontname="helv", color=(0.01, 0.52, 0.78))
