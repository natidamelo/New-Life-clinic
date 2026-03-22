/**
 * This is a shim for @emotion/styled to avoid the import error in MUI
 * It exports the same interface as @emotion/styled but uses the actual implementation
 */
import styled from '@emotion/styled/base';

export default styled;
export { styled }; 