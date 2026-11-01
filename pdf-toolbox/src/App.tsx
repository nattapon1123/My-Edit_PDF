import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './tools/Home'
import MergePdf from './tools/MergePdf'
import SplitPdf from './tools/SplitPdf'
import ImageTool from './tools/ImageTool'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/merge" element={<MergePdf />} />
          <Route path="/split" element={<SplitPdf />} />
          <Route path="/image" element={<ImageTool />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}