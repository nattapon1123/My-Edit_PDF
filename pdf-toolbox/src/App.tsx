import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './tools/Home'

const MergePdf = lazy(() => import('./tools/MergePdf'))
const SplitPdf = lazy(() => import('./tools/SplitPdf'))
const ImageTool = lazy(() => import('./tools/ImageTool'))
const PdfToImage = lazy(() => import('./tools/PdfToImage'))
const PageNumbers = lazy(() => import('./tools/PageNumbers'))
const Watermark = lazy(() => import('./tools/Watermark'))
const CropPdf = lazy(() => import('./tools/CropPdf'))
const ScanPdf = lazy(() => import('./tools/ScanPdf'))
const RepairPdf = lazy(() => import('./tools/RepairPdf'))
const OcrPdf = lazy(() => import('./tools/OcrPdf'))
const EditPdf = lazy(() => import('./tools/EditPdf'))

function ToolLoading() {
  return (
    <p role="status" className="mx-auto max-w-4xl p-6 text-gray-600">
      กำลังโหลดเครื่องมือ...
    </p>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route
            path="/merge"
            element={
              <Suspense fallback={<ToolLoading />}>
                <MergePdf />
              </Suspense>
            }
          />
          <Route
            path="/split"
            element={
              <Suspense fallback={<ToolLoading />}>
                <SplitPdf />
              </Suspense>
            }
          />
          <Route
            path="/image"
            element={
              <Suspense fallback={<ToolLoading />}>
                <ImageTool />
              </Suspense>
            }
          />
          <Route
            path="/pdf-to-image"
            element={
              <Suspense fallback={<ToolLoading />}>
                <PdfToImage />
              </Suspense>
            }
          />
          <Route
            path="/page-numbers"
            element={
              <Suspense fallback={<ToolLoading />}>
                <PageNumbers />
              </Suspense>
            }
          />
          <Route
            path="/watermark"
            element={
              <Suspense fallback={<ToolLoading />}>
                <Watermark />
              </Suspense>
            }
          />
          <Route
            path="/crop"
            element={
              <Suspense fallback={<ToolLoading />}>
                <CropPdf />
              </Suspense>
            }
          />
          <Route
            path="/scan"
            element={
              <Suspense fallback={<ToolLoading />}>
                <ScanPdf />
              </Suspense>
            }
          />
          <Route
            path="/repair"
            element={
              <Suspense fallback={<ToolLoading />}>
                <RepairPdf />
              </Suspense>
            }
          />
          <Route
            path="/ocr"
            element={
              <Suspense fallback={<ToolLoading />}>
                <OcrPdf />
              </Suspense>
            }
          />
          <Route
            path="/edit"
            element={
              <Suspense fallback={<ToolLoading />}>
                <EditPdf />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}