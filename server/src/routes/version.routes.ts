import express from 'express';
import Version from '../models/version.model';
import Document from '../models/document.models';

const router = express.Router();

// Save new version
router.post('/', async (req, res) => {
  try {
    const { documentId, name, data, drawings,} = req.body;

    
    
    const version = await Version.create({
      documentId,
      name,
      data,
      drawings,
    });

    res.status(201).send(version);
  } catch (error) {
    console.error('Error saving version:', error);
    res.status(400).send({ error: 'Error saving version' });
  }
});

// Get all versions for a document
router.get('/:documentId', async (req, res) => {
  try {
    const versions = await Version.find({ 
      documentId: req.params.documentId 
    }).sort('-createdAt');

    res.send(versions);
  } catch (error) {
    res.status(500).send({ error: 'Error fetching versions' });
  }
});

router.get('/documents/:documentId/versions/:versionId', async (req, res) => {
    try {
      const documentId = req.params.documentId;
      const versionId = req.params.versionId;
      
  
      // Get version data
      const version = await Version.findOne({
        _id: versionId,
        documentId
      }).select('name data createdAt');
  
      if (!version) {
          res.status(404).json({ error: 'Version not found' });
            return
      }
  
      res.json({
        ...version.toObject(),
        createdAt: version.createdAt.toISOString()
      });
  
    } catch (error) {
      console.error('Error fetching version:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

export { router as versionRoutes };
