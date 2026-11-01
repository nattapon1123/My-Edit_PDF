import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './tools/Home'
import MergePdf from './tools/MergePdf'
import SplitPdf from './tools/SplitPdf'
import ImageTool from './tools/ImageTool'
import PdfToImage from './tools/PdfToImage'
import PageNumbers from './tools/PageNumbers'
import Watermark from './tools/Watermark'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<MergePdf />} />
          <Route path="/split" element={<SplitPdf />} />
          <Route path="/image" element={<ImageTool />} />
          <Route path="/pdf-to-image" element={<PdfToImage />} />
          <Route path="/page-numbers" element={<PageNumbers />} />
          <Route path="/watermark" element={<Watermark />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}